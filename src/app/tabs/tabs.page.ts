import { Component } from '@angular/core';
import { TabsService } from '../service/tabs.service';
import { environment } from 'src/environments/environment';
import { fromEvent } from 'rxjs';
import { DeviceDetectorService } from 'ngx-device-detector';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss']
})
export class TabsPage {

  cexOutline!: string;
  isLandingPage!: boolean;
  largeScreenAjustment!: string;

  constructor(private tabService: TabsService,
              private deviceService: DeviceDetectorService
  ) {
    this.cexOutline = environment.icons('cex', true);
  }

  tabChangeHandler(event:{tab: string}){
    this.tabService.triggerTabChangingEmmiter(event.tab);
  }

  ngOnInit(){
    console.info(`MrTracker.TabsPage.ngOnInit:: starting`)
    this.adjustlandingPage()
    fromEvent(window, 'resize').subscribe(() => this.adjustlandingPage())
    console.info(`MrTracker.TabsPage.ngOnInit:: finishing`)
  }

  adjustlandingPage(){
    console.debug(`MrTracker.TabsPage.setIsLandingPage:: viewport width is ${window.innerWidth} and hieght is ${window.innerHeight}`)
    this.isLandingPage = this.checkIfDeviceMobile();
    this.largeScreenAjustment = window.innerWidth >= 1230 ? 'exampleFrame largeScreenAdjust' : 'exampleFrame'

    console.debug(`MrTracker.TabsPage.setIsLandingPage:: is landing page ${this.isLandingPage} and is large screen ${this.largeScreenAjustment}`)
  }

  checkIfDeviceMobile(): boolean{
    console.info(`MrTracker.TabsPage.setIsLandingPage:: checking if device is mobile,`, this.deviceService.isMobile())
    console.info(`MrTracker.TabsPage.setIsLandingPage:: checking if device is table,`, this.deviceService.isTablet())
    if(this.deviceService.isMobile() || this.deviceService.isTablet()){
      return false
    } else {
      return true
    }
  }

}
