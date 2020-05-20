# relatedlist-lwc
reusable related list lwc, with configurable row level and list level actions. This helps resolve limitations on standard related list(s) when used in Communities that standard actions can't be overridden and custom list actions are not supported.

# Supported Features:
  - Configurable Parent and Child objects
  - Configurable Columns 
  - Standard and Custom List Actions
  - Standard and Custom Record Actions
  - Custom WHERE Clause
  - Export and Import data to/from CSV
  - Activate/Deactivate any configurations, fields, actions - no need to delete them.

# Configuration: 

   - 3 Custom Metata Types drive the setup and usage of the component
      _ Related List Configuration (RLC)
      _ Related List Field Configuration - related to RLC
      _ Related List Action Configuration - related to RLC
      
# Compoment Usability:
   - RecordPage: on a record page in Lightning App Builder.
   - Community Page: on a Lightning community page in Experience Builder.

# Future Enhancements:

* Inline Editing
* Sortable Columns
* Flow for configuration
    * RL
    * Fields
    * Custom Actions
    * Query Filters 
* Column Level Filter (filter values are automatically determined by distinct values in all rows...may be a little overhead?)


_*Known Issues*_

* Related List does not refresh on standard Edit action.
* Record Type Selection and Default Field Values not supported in Communities.

