import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { getRecord, deleteRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
//import { encodeDefaultFieldValues } from 'lightning/pageReferenceUtils';
import { refreshApex } from '@salesforce/apex';

import getRelatedListConfigDetails from '@salesforce/apex/RelatedRecordService.getRelatedListConfigDetails';
import getRelatedData from '@salesforce/apex/RelatedRecordService.getRelatedData';

export default class relatedlist extends NavigationMixin(LightningElement) {
    //Adminstrator accessible attributes in app builder
    @api rlcName;                                                   //Related List Configuration Name from custom metadata.
    @api recordId;                                                  //current record id of lead, case, opportunity, contact or account
    //@api rlcName='AccountContacts';                               //To run in Local Server, hard corded the config name
    //@api recordId='0012100000mprOkAAI';                           //To run in Local Server, hard corded the AccountId
    
    @track parentRecord;                                            //Parent Record managed via LDS, to enfore data refresh in case of edit action.
    
    //
    //Component calculated attributes
    //
    @track isConfigAvailable = true;                                //set to false, if there is no config recieved from custom metadata
    @track title = "";                                              //title for the Related List.
    @track iconurl = "";                                            //child object icon url, to display in the related list.
    @track iconBackground = "";                                     //background style for child object icon. 
    @track layout = "";                                             //layout for related list 'Card or List'. 
    @track height;                                                  //height of the relatedlist.
    @track listActions = [];                                        //related list level actions to be determined based on the proprty value
    @track columns = [];                                            //columns to be wired based on the fieldList for the Child Object to be rendered in the related list
    @track data = [];                                               //related records to be fetched and displayed.
    @track rowsize;                                                 //number of rows label to display with related list header.
    
    @track parentIdField;                                           //parent id field of the Child object in the related list.
    
    @track isLoaded = false;

    wiredResults;                                                   //apex result to destructure and used for refreshing the data wire api.
    childObject = "";
    parentObject = ""
    relationshipApiName ="";

    /* @wire(getRecord, { recordId: '$recordId', fields: [ 'Id', 'Name' ] })
    wiredParentRecord(result){
        if (result.data){
            this.parentRecord = result.data;
            
            //this.refreshRLData();
        }
    }; */

    @wire(getRelatedListConfigDetails, { rlcName: '$rlcName'} )
    wiredRLConfig(result) {
        let config = {};
        this.isLoaded = false;
        let rowActions = [];
        let columns = [];
        if (result.data){
            config = result.data;
            if(undefined != config.title && config.title.length > 0){
                this.title = config.title;
                this.iconurl = config.iconurl;
                this.iconBackground = "background-color:"+config.iconBGColor;
                this.layout = config.layout;
                this.height = "height: " + config.height +"px";
                this.parentIdField = config.parentIdField;
                if(config.actions != null){
                    rowActions = config.actions.filter(function (action) {
                        return ('RowAction' === action.type);
                    });
                }
                if(config.fields != null){
                    config.fields.forEach((col) => { columns.push(col) });
                    if(rowActions.length > 0){
                        columns.push({ type: 'action', typeAttributes: { rowActions: rowActions } });
                    }
                }
                this.columns = columns;
                this.childObject = config.childObject;
                this.parentObject = config.parentObject;
                this.relationshipApiName = config.relationshipName;

                if(config.actions != null){
                    this.listActions = config.actions.filter(function (action) {
                        return ('ListAction' === action.type);
                    });
                }
            }else{
                this.isConfigAvailable = false;
            }
        }
        
        this.isLoaded = true;
    }

    @wire(getRelatedData, { rlcName: '$rlcName', parentId: '$recordId'} )
    wiredData(result) {
        this.wiredResults = result;
        this.isLoaded = false;
        if(result.data){
            this.data = result.data;
            this.rowsize = this.data.length;
        }
        this.isLoaded = true;
    }

    handleListAction(event) {
        event.preventDefault();
        event.stopPropagation();
        const actionName = event.target.name;
        const lAction = this.listActions.filter(function (action) {
            return (actionName === action.name);
        });
        switch (actionName) {
            case 'New':
                //console.log('handleNew action');
                this.handleNew(this.childObject, this.recordId);
                break;
            default:
                try{
                    
                    this.handleCustom(this.childObject, lAction[0].actionURL, lAction[0].targetType, lAction[0].params);
                }catch(e){
                    console.log('Error processing custom list action>>', actionName , e);
                }
                break;
        }
    }

    handleRowAction(event) {
        event.preventDefault();
        event.stopPropagation();
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        switch (actionName) {
            case 'View':
                this.handleView(this.childObject, row.Id);
                break;
            case 'Edit':
                this.handleEdit(this.childObject, row.Id);
                break;
            case 'Delete':
                this.handleDelete(this.childObject, row.Id);
                break;
            default:
                try{
                    this.handleCustom(this.childObject, event.detail.action.actionURL, event.detail.action.targetType, event.detail.action.params);
                }catch(e){
                    console.log('Error processing custom row action',actionName, e);
                }
                break;
        }
    }
    handleViewAllAction(){
        this[NavigationMixin.Navigate]({
            type: 'standard__recordRelationshipPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: this.parentObject,
                relationshipApiName: this.relationshipApiName,
                actionName: 'view'
            }
        });
    }

    handleUploadFinished(event){
        //nothing for now
    }

    handleNew(object, recordId){
                
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: object,
                actionName: 'new'
            },
            state: {
               defaultFieldValues : encodeDefaultFieldValues(JSON.parse("{\"" + this.parentIdField + "\":\"" + recordId + "\", FirstName:Ramana}"))
            }
        });
    } 
    
    handleView(object, recordId){
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                objectApiName: object, // objectApiName is optional
                actionName: 'view'
            }
        });
    } 
    
    handleEdit(object, recordId){
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                objectApiName: object, // objectApiName is optional
                actionName: 'edit'
            }
        });
    } 
    
    handleDelete(object, recordId){
        deleteRecord(recordId)
        .then(() => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Record deleted',
                    variant: 'success'
                })
            );
            this.refreshRLData();
        })
        .catch(error => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error deleting record',
                    message: error.body.message,
                    variant: 'error'
                })
            );
        });
    } 
    
    handleCustom(object, actionUrl, tgtType, params){
        // Navigate to a URL
        if('URL' === tgtType){
            this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: {
                    url: actionUrl = (params != null ? actionUrl + '?' + params : actionUrl)
                }
            }, true);
        }else if('Lightning Component' === tgtType){
            this[NavigationMixin.Navigate]({
                type: 'standard__component',
                attributes: {
                    componentName: actionUrl
                },
                state: params
            }, true);
        }
    }
    
    refreshRLData() {
        return refreshApex(this.wiredResults);
    }
}