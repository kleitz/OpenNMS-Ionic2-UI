import { Component } from '@angular/core';
import { NavController, LoadingController, ToastController, AlertController } from 'ionic-angular';

import { OnmsServer } from '../../models/onms-server';
import { OnmsAck } from '../../models/onms-ack';
import { OnmsNotification } from '../../models/onms-notification';

import { NotificationPage } from '../notification/notification';

import { OnmsServersService } from '../../services/onms-servers';
import { OnmsNotificationsService } from '../../services/onms-notifications';

@Component({
  selector: 'page-notifications',
  templateUrl: 'notifications.html'
})
export class NotificationsPage {

  noNotifications = false;
  notifications: OnmsNotification[] = [];
  notificationFilter: string;
  onmsServer: OnmsServer;

  private start: number = 0;

  constructor(
    private navCtrl: NavController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private serversService: OnmsServersService,
    private notifyService: OnmsNotificationsService
  ) {}

  ionViewWillLoad() {
    this.serversService.getDefaultServer()
      .then((server: OnmsServer) => {
        this.onmsServer = server;
        this.onUpdate();
      })
      .catch(error => console.log(error));
  }

  onRefresh(refresher: any) {
    this.onUpdate(false).then(() => refresher.complete());
  }

  onUpdate(showLoading: boolean = true) : Promise<any> {
    let loading = null;
    if (showLoading) {
      loading = this.loadingCtrl.create({
        content: 'Loading notifications, please wait...'
      });
      loading.present();
    }
    this.notifications = [];
    this.start = 0;
    return this.loadNotifications()
      .then(() => {
        if (showLoading) loading.dismiss();
        this.noNotifications = this.notifications.length == 0
      })
      .catch(() => loading.dismiss());
  }

  onShowNotification(notification: OnmsNotification) {
    this.navCtrl.push(NotificationPage, {server: this.onmsServer, notification: notification});
  }

  onSearchNotifications(event: any) {
    this.notificationFilter = event.target.value;
    this.onUpdate();
  }

  onCancelSearch(event: any) {
    if (this.notificationFilter) {
      this.notificationFilter = null;
      this.onUpdate();
    }
  }

  onAckNotification(notification: OnmsNotification) {
    this.notifyService.acknowledgeNotification(this.onmsServer, notification)
      .then((ack: OnmsAck) => {
        notification.update(ack);
        this.toast('Notification acknowledged!');
      })
      .catch(error => this.alert('Ack Error', error.message));
  }

  onUnackNotification(notification: OnmsNotification) {
    this.notifyService.unacknowledgeNotification(this.onmsServer, notification)
      .then((ack: OnmsAck) => {
        notification.update(ack);
        this.toast('Notification unacknowledged!');
      })
      .catch(error => this.alert('Unack Error', error.message));
  }

  onInfiniteScroll(infiniteScroll: any) {
    this.start += 10;
    this.loadNotifications().then((canScroll: boolean) => {
      infiniteScroll.complete();
      infiniteScroll.enable(canScroll);
    });
  }

  formatUei(uei: string) {
    let ret: string = uei.replace(/^.*\//g, '');
    ret = ret.search(/_/) == -1 ? ret.replace(/([A-Z])/g, ' $1') : ret.replace('_', ' ');
    return ret.charAt(0).toUpperCase() + ret.slice(1);
  }

  getIconColor(notification: OnmsNotification) {
    return notification.severity + '_';
  }

  getIcon(notification: OnmsNotification) {
    const index = notification.getSeverityIndex();
    if (index > 5)
      return 'flame';
    if (index > 3)
      return 'warning';
    return 'alert';
  }

  private loadNotifications() : Promise<boolean> {
    return new Promise(resolve => {
      this.notifyService.getNotifications(this.onmsServer, this.start, this.notificationFilter)
        .then((notifications: OnmsNotification[]) => {
          console.log(notifications);
          notifications.forEach(n => this.notifications.push(n));
          resolve(notifications.length > 0);
        });
    });
  }

  private toast(message: string) {
    const toast = this.toastCtrl.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }

  private alert(title: string, message: string) {
    const alert = this.alertCtrl.create({
      title: title,
      message: message,
      buttons: ['Ok']
    });
    alert.present();
  }

}
