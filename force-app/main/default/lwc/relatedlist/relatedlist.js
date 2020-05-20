import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { getRecord, deleteRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { encodeDefaultFieldValues } from 'lightning/pageReferenceUtils';
import { refreshApex } from '@salesforce/apex';

import getRelatedListConfigDetails from '@salesforce/apex/RelatedRecordService.getRelatedListConfigDetails';
import getRelatedData from '@salesforce/apex/RelatedRecordService.getRelatedData';
import importDataFromCSV from '@salesforce/apex/RelatedRecordService.importDataFromCSV';

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

    newObjectPageReference = "";

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
                    config.fields.forEach((col) => { columns.push(col);});
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
            let data = result.data;
            let nameUrl;
            this.data = data.map(row => { 
                nameUrl = '/' + row.Id;
                return {...row , nameUrl};
            })
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
        const actionName = event.target.name;
        const uploadedFiles = event.detail.files;
        if ('Import' === actionName) {
            this.handleImportDataFile(uploadedFiles);
        }
    }

    handleNew(object, recordId){
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: object,
                actionName: 'new'
            },
            state: {
                nooverride: 1,
                useRecordTypeCheck: 1,
                defaultFieldValues : encodeDefaultFieldValues(JSON.parse("{\"" + this.parentIdField + "\":\"" + recordId + "\"}"))
            }
        }, true);
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
        if('VF Page' === tgtType){
            let paramKeyVal = '';
            if(params != undefined &&  params != null && params.length > 0){
                let paramList = params.split('&');
                paramList.forEach(item =>{
                    let keyVal = item.split('=');
                    paramKeyVal = paramKeyVal.length > 0 ? paramKeyVal + '&' : paramKeyVal;
                    paramKeyVal += keyVal[0] + '=' + (keyVal[1].includes('this.recordId') ? this.recordId : keyVal[1]);
                });
            }
            //
            // VF pages in Lightning Communities are invoked with a specific URL pattern - Will need URL hacking for this.
            // TO-DO: Revisit this section if there is resolution on VF page URL patterns.
            //
            let urlString = window.location.href;
            if(urlString.indexOf("/s/") > -1){
                let baseURL = urlString.substring(0, urlString.indexOf("/s/")+3);
                actionUrl = paramKeyVal != null && paramKeyVal.length > 0 ? actionUrl + '?' + paramKeyVal : actionUrl;
                actionUrl = baseURL + 'sfdcpage/' + actionUrl.replace(/\//g, '%2F').replace('?', '%3F').replace(/=/g,'%3D').replace(/&/g,'%26');
                this[NavigationMixin.Navigate]({
                    type: 'standard__webPage',
                    attributes: {
                        url: actionUrl
                    }
                }, true);
            }else{
            
                this[NavigationMixin.Navigate]({
                    type: 'standard__webPage',
                    attributes: {
                        url: encodeURI(actionUrl = (paramKeyVal != null && paramKeyVal.length > 0 ? actionUrl + '?' + paramKeyVal : actionUrl))
                    }
                }, true);
            }
            
        }else if('Lightning Component' === tgtType){
            this[NavigationMixin.Navigate]({
                type: 'standard__component',
                attributes: {
                    componentName: actionUrl
                },
                state: params
            }, true);
        }else if('Export' === tgtType){
            this.exportToCSVFile();
        }else if('Community Page' === tgtType){
            this[NavigationMixin.Navigate]({
                type: 'comm__namedPage',
                attributes: {
                    pageName: actionUrl
                }
            });
        }else if('URL' === tgtType){
            let paramKeyVal = '';
            if(params != undefined &&  params != null && params.length > 0){
                let paramList = params.split('&');
                paramList.forEach(item =>{
                    let keyVal = item.split('=');
                    paramKeyVal = paramKeyVal.length > 0 ? paramKeyVal + '&' : paramKeyVal;
                    paramKeyVal += keyVal[0] + '=' + (keyVal[1].includes('this.recordId') ? this.recordId : keyVal[1]);
                });
            }

            this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: {
                    url: encodeURI(actionUrl = (paramKeyVal != null && paramKeyVal.length > 0 ? actionUrl + '?' + paramKeyVal : actionUrl))
                }
            }, true);
        }    

    }
    
    refreshRLData() {
        return refreshApex(this.wiredResults);
    }

    exportToCSVFile() {   
        //new line character for each data row
        let newLineChar = '\n';

        //
        // csv content fabricated from data rows, 
        // will Column Names as row 1 in CSV
        //
        let csvString = '';
        let colData = new Set();
        colData.add('Id');
        this.columns.forEach(col => {
            colData.add(col.fieldName);
        });
        colData = Array.from(colData);
        csvString += colData.join(',');
        csvString += newLineChar;

        // Add table data rows into csv string, as comma separated values in each row.
        for(let i=0; i < this.data.length; i++){
            let colValue = 0;
            for(let key in colData) {
                if(colData.hasOwnProperty(key)) {
                    let rowKey = colData[key];
                    if(colValue > 0){
                        csvString += ',';
                    }
                    let value = this.data[i][rowKey] === undefined ? '' : this.data[i][rowKey];
                    csvString += '"'+ value +'"';
                    colValue++;
                }
            }
            csvString += newLineChar;
        }
        
        //
        // simulate file download action using 'a' tag with appropriate encoding.
        // CSV File Name is set to '<parentId>_<child object name>_<todays date>.csv'
        //
        let downloadElement = document.createElement('a');
        downloadElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvString);
        downloadElement.target = '_self';
        let today = new Date();
        downloadElement.download = this.recordId + '_' + this.childObject + '_' + (today.getMonth() + 1) +today.getDate() + today.getFullYear()  +'.csv';
        document.body.appendChild(downloadElement);
        downloadElement.click(); 
    }

    handleImportDataFile(uploadedFiles){
        importDataFromCSV({rlcName: this.rlcName, parentId: this.recordId, documentId : uploadedFiles[0].documentId})
        .then(result => {
            let importedData = result;
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: this.childObject + ' data imported successfully!',
                    variant: 'success'
                })
            );
            this.refreshRLData();
        })
        .catch(error => {
            this.error = error;
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error!!',
                    message: JSON.stringify(error),
                    variant: 'error',
                }),
            );     
        })
    }

    get acceptedFormats() {
        return ['.csv','.pdf', '.png','.gif', '.jpeg','.doc', '.xls','.docx', '.xlsx'];
    }
    get acceptedImportFormats() {
        return ['.csv'];
    }
}