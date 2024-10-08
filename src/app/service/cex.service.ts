import { HttpClient, HttpParams } from '@angular/common/http';
import { EventEmitter, Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CexEntry } from '../model/cex-entry.model';
import { forkJoin, map, mergeMap, of } from 'rxjs';
import { StorageService } from './storage.service';
import { CexResults } from '../model/cex-results.model';
import { StorageResponse } from '../model/storage-response.model';
import { Entry } from '../model/entry.model';

@Injectable({
  providedIn: 'root'
})
export class CexService {

  cexList!: CexEntry[];
  cexResults!: CexResults;
  existingTitles!: string[];

  cexListUpdateCompleteEmitter: EventEmitter<CexResults> = new EventEmitter();

  constructor(private http: HttpClient,
              private storageService: StorageService) { }

  async updateList(){
    console.info(`mrTracker.CexService.updateList:: Starting`)
    this.cexList = [];
    this.cexResults = {
      cexList: this.cexList,
      expiry: new Date()
    }
    console.debug(`mrTracker.CexService.updateList:: waiting for existing list`)
    await this.storageService.getEntry('trackerList').then((response: StorageResponse) => {
      if(response.status){
        console.debug(`mrTracker.CexService.updateList:: list item returned`)
        this.existingTitles = response.item.map((entry: Entry) => entry.title);
        console.debug(`mrTracker.CexService.updateList:: verifing list is populated`)
        if(!this.existingTitles) this.existingTitles = []
      } else {
        console.debug(`mrTracker.CexService.updateList:: list empty`)
        this.existingTitles = [];
      }
    })
    console.debug(`mrTracker.CexService.updateList:: got list`, this.existingTitles)

    this.getSearchResults().pipe(

      mergeMap((results:any) => {
        console.debug(`mrTracker.CexService.updateList:: initial query returned`, results)
        let pageNumbers = Array.from(Array(results.nbPages).keys()) 
        console.debug(`mrTracker.CexService.updateList:: list of pages set to ${results.nbPages}`, pageNumbers)
        let urlPrams = environment.cexDefaultSearchParams;
        if(results.nbHits > 100) urlPrams.set('hitsPerPage', '100')
        let requestList: any[] = [];
        pageNumbers.forEach((page:number) => {
          console.debug(`mrTracker.CexService.updateList:: updating page to ${page}`)
          urlPrams.set('page', (page).toString());
          console.debug(`mrTracker.CexService.updateList:: url params are now`, urlPrams)
          requestList.push(this.getSearchResults(urlPrams))
        })
        return requestList;
      })
    )
    .pipe(
      mergeMap((requestList:any) =>  this.getAllSearchResults(requestList))
      
      // console.debug('inside mergeMap subscribe called')
    )
    .subscribe({
      next: (completeResulSet:any) => {
        console.log(`mrTracker.CexService.updateList:: complete result set looks like`, completeResulSet)
        this.cexList.push(completeResulSet)
      },
      complete: () => {
        console.log('mrTracker.CexService.updateList:: saving results from queries')
        this.storageService.setEntry('cexList', this.cexResults).then(
          (response: StorageResponse) => {
            if(response.status){
              this.cexListUpdateCompleteEmitter.emit(this.cexResults);
            } else {
              this.cexListUpdateCompleteEmitter.emit({cexList: [], expiry: new Date})
            }
        }
      )
    }
  });
}

  getAllSearchResults(requestList:any){
    return forkJoin((requestList)).pipe(
      mergeMap((forkResults:any) => {
      console.log(`mrTracker.CexService.getAllSearchRestults:: fork results set is`, forkResults)
        let tempCexList: CexEntry[] = [];
        forkResults.forEach((resultSet:any) => {
          console.debug(`mrTracker.CexService.getAllSearchRestults:: cex returned for page ${resultSet.page}`, resultSet)
          if(this.existingTitles.length > 0){
            resultSet.hits
          .filter((hit:any) => this.existingTitles.indexOf(this.formatBoxName(hit.boxName))  == -1)
          .filter((hit:any) => hit.availability.includes("In Stock Online"))
          .filter((hit:any) => hit.sellPrice < 4)
          .forEach((hit:any) => {
            tempCexList.push({
              cexId: hit.boxId,
              cost: hit.sellPrice,
              description: this.formatBoxName(hit.boxName),
              format: this.convertCexCategory(hit.categoryFriendlyName)
            })
          })
          } else {
            resultSet.hits
          .filter((hit:any) => hit.availability.includes("In Stock Online"))
          .filter((hit:any) => hit.sellPrice < 4)
          .forEach((hit:any) => {
            tempCexList.push({
              cexId: hit.boxId,
              cost: hit.sellPrice,
              description: this.formatBoxName(hit.boxName),
              format: this.convertCexCategory(hit.categoryFriendlyName)
            })
          })
          }
        
        })
        console.log(`mrTracker.CexService.getAllSearchRestults:: tempCexList set is`, tempCexList)
      return tempCexList;    
      
    })
  )

  }

  getSearchResults(searchQuery?: Map<string,string>){
    
    let cexDefaultSearchParams: Map<string,string> = environment.cexDefaultSearchParams
    let urlPrams: HttpParams = new HttpParams();
    if(searchQuery != undefined)  cexDefaultSearchParams = searchQuery;

    console.debug(`mrTracker.CexService.getSearchResults:: starting with url params map`, cexDefaultSearchParams)

    cexDefaultSearchParams.forEach((value:string, name:string) => {
      urlPrams = urlPrams.set(name, value);
    });

    return this.http.get(environment.cexSearchApiBase, {params: urlPrams});
    
  }

  formatBoxName(boxName:string):string{
    return boxName.indexOf('(') != -1 ? boxName.substring(0, boxName.indexOf('(')).trim() : boxName;
  }

  convertCexCategory(cexCategory:string):string{
    console.debug(`mrTracker.CexService.convertFormat:: starting with ${cexCategory}`)
    console.debug(`mrTracker.CexService.convertFormat:: flow for disection is - split ${cexCategory.split(/\s/).toString()}, includes ${cexCategory.split(/\s/).includes('4k')}, returned ${cexCategory.split(/\s/).includes('4k') ? '4k' : 'bluray'}`)
    return cexCategory.split(/\s/).indexOf('4K') != -1 ? '4k' : 'Bluray';
  }


}
