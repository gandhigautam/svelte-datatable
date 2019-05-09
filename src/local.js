import Fuse from 'fuse.js';
import { collect } from './data-grid';

const Model = function () {
	const model = this;
	
    model.getPaged = function(props, pred, paginated) {
		const { selectedPage } = paginated;           
		if (!pred || pred({page: selectedPage})) {
			if (props.page) {
				props.currentPage = props.page;
            }

            if (props.selectedPage !== undefined)
				paginated.selectedPage = props.selectedPage;
			if (props.currentPage !== undefined)	
				paginated.currentPage = props.currentPage;
			if (props.currentPerPage !== undefined)
				paginated.currentPerPage = props.currentPerPage;
			if (props.paginate !== undefined)
				paginated.paginate = props.paginate;
			
			model.processRows(props.rows || paginated.rows, props.searchText, paginated);

			return paginated;
		}
    } 
    
    model.paginateRows = function(rows, paginated) {
        let paginatedRows = rows;
        const { currentPerPage, currentPage, paginate } = paginated;
		if (paginate)
			paginatedRows = paginatedRows.slice((currentPage - 1) * currentPerPage, currentPerPage === -1 ? 
				paginatedRows.length + 1 : currentPage * currentPerPage);
		paginated.rows = paginatedRows;
    }
    
    model.processRows = function(rows, searchText, paginated) {
        let computedRows = rows;
        const { currentPage, currentPerPage, columns,
            sortable, sortColumn, sortType, 
            searchInput, exactSearch } = paginated;				
		if (!searchText) {
			searchText = searchInput;
        }	
		if (sortable !== false && sortColumn > -1 && columns)
			computedRows = computedRows.sort((x, y) => {
				if (!columns[sortColumn])
					return 0;

				const cook = (x) => {
					x = collect(x, columns[sortColumn].field);
					if (typeof(x) === 'string') {
						x = x.toLowerCase();
							if (columns[sortColumn].numeric)
							x = x.indexOf('.') >= 0 ? parseFloat(x) : parseInt(x);
					}
					return x;
				}

				x = cook(x);
				y = cook(y);

				return (x < y ? -1 : (x > y ? 1 : 0)) * (sortType === 'desc' ? -1 : 1);
			});

		if (searchText) {
			const searchConfig = { keys: columns.map(c => c.field) }

			// Enable searching of numbers (non-string)
			// Temporary fix of https://github.com/krisk/Fuse/issues/144
				searchConfig.getFn = function (obj, path) {
				if(Number.isInteger(obj[path]))
				return JSON.stringify(obj[path]);
					return obj[path];
			}

			if (exactSearch) {
				//return only exact matches
				searchConfig.threshold = 0,
				searchConfig.distance = 0
			}

			computedRows = (new Fuse(computedRows, searchConfig)).search(searchText);
		}

		paginated.pageCount = Math.ceil(computedRows.length / currentPerPage);
		paginated.processedRows = computedRows;
		paginated.rowCount = computedRows.length;
		model.paginateRows(computedRows, paginated);
	}	
};

export default function create() {
    return new Model();
}
