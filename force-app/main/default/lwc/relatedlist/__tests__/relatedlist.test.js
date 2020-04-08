import { createElement } from 'lwc';
import { registerApexTestWireAdapter } from '@salesforce/sfdx-lwc-jest';
import { deleteRecord } from 'lightning/uiRecordApi';

//import component to be tested along with any Apex methods to cover the compomnent tests
import RelatedListComp from 'c/relatedlist';
import getRelatedListConfigDetails from '@salesforce/apex/RelatedRecordService.getRelatedListConfigDetails';
import getRelatedData from '@salesforce/apex/RelatedRecordService.getRelatedData';

// Realistic data with a list of contacts
const mockGetConfigData = require('./data/getRelatedListConfigDetails.json');
const mockGetRecordData = require('./data/getRelatedData.json');

// An empty list of records to verify the component does something reasonable when there is no data to display
const mockGetNoData = require('./data/getNoData.json');

// Register as Apex wire adapter. Some tests verify that provisioned values trigger desired behavior.
const getConfigDataAdapter = registerApexTestWireAdapter(getRelatedListConfigDetails);
const getRecordDataAdapter = registerApexTestWireAdapter(getRelatedData);

describe('c-related-list', () => {
    afterEach(() => {
        // The jsdom instance is shared across test cases in a single file so reset the DOM
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        // Prevent data saved on mocks from leaking between tests
        //jest.clearAllMocks();
    });
    
    describe('getRelatedListConfigDetails @wire data', () => {
        
        it('renders related list headers and buttons based on the configuration', () => {
            // Create initial element
            const element = createElement('c-related-list', {
                is: RelatedListComp
            });
            document.body.appendChild(element);

            // Emit data from @wire
            getConfigDataAdapter.emit(mockGetConfigData);

            return Promise.resolve().then(() => {
                // Select elements for validation
                const headerEls = element.shadowRoot.querySelectorAll('.slds-card__header-title');
                expect(headerEls.length).toBe(1);

                const buttonEls = element.shadowRoot.querySelectorAll('lightning-button-group');
                const listActions = mockGetConfigData.actions.filter(function (action) {
                    return ('ListAction' === action.type);
                });
                expect(buttonEls.length).toBe(1);

            });
        });

        it('renders NO headers and buttons if the configuration is not avaialble', () => {
            // Create initial element
            const element = createElement('c-related-list', {
                is: RelatedListComp
            });
            document.body.appendChild(element);

            // Emit data from @wire
            getConfigDataAdapter.emit(mockGetNoData);

            return Promise.resolve().then(() => {
                // Select elements for validation
                const headerEls = element.shadowRoot.querySelectorAll('.slds-card__header-title');
                expect(headerEls.length).toBe(0);

                const buttonEls = element.shadowRoot.querySelectorAll('lightning-button-group');
                expect(buttonEls.length).toBe(0);

                const errorEls = element.shadowRoot.querySelectorAll('p');
                expect(errorEls.length).toBe(1);

            });
        });
    });

    describe('getRelatedData @wire data', () => {
        it('renders related list with data, based on the configuration', () => {
            // Create initial element
            const element = createElement('c-related-list', {
                is: RelatedListComp
            });
            document.body.appendChild(element);

            // Emit data from @wire
            getRecordDataAdapter.emit(mockGetRecordData);

            return Promise.resolve().then(() => {
                // Select elements for validation
                const headerEls = element.shadowRoot.querySelectorAll('.slds-card__header-title');
                expect(headerEls.length).toBe(1);

                const buttonEls = element.shadowRoot.querySelectorAll('lightning-button-group');
                expect(buttonEls.length).toBe(1);

                expect(mockGetRecordData.length).toBe(2);
            });
        });

        it('renders related list with NO data, based on the configuration', () => {
            // Create initial element
            const element = createElement('c-related-list', {
                is: RelatedListComp
            });
            document.body.appendChild(element);

            // Emit data from @wire
            getConfigDataAdapter.emit(mockGetConfigData);
            getRecordDataAdapter.emit(mockGetNoData);

            return Promise.resolve().then(() => {
                // Select elements for validation
                const headerEls = element.shadowRoot.querySelectorAll('.slds-card__header-title');
                expect(headerEls.length).toBe(1);

                const buttonEls = element.shadowRoot.querySelectorAll('lightning-button-group');
                expect(buttonEls.length).toBe(1);

                expect(mockGetNoData).toBeNull;
            });
        });

        it('sends event "delete" RowAction with contactId, on click', () => {
    
            // Create initial element
            const element = createElement('c-related-list', {
                is: RelatedListComp
            });
            document.body.appendChild(element);
    
            // Mock handler for child event
            const handler = jest.fn();
            // Add event listener to catch child event
            element.addEventListener('handleRowAction',   handler  );
    
            // Emit data from @wire
            getRecordDataAdapter.emit(mockGetRecordData);
            
            // Return a promise to wait for any asynchronous DOM updates. Jest
            // will automatically wait for the Promise chain to complete before
            // ending the test and fail the test if the promise rejects.
            return Promise.resolve()
                .then(() => {
                    // Select a href to simulate user interaction
                    const linkEl = element.shadowRoot.querySelectorAll('lightning-button .btn-secondary');
                    console.log('linkEl....', linkEl.length);
                    console.log('linkEl....', linkEl);
                    linkEl[1].click();
                })
                .then(() => {
                    // Validate if event got fired
                    expect(handler).toHaveBeenCalled();
                    expect(handler.mock.calls[0][0].detail).toEqual(
                        EVENT_DETAIL_PARAMETER
                    );
                });
        });
    });

    
});