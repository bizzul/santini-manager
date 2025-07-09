import { NextApiRequest } from "next";
import { isNumber } from "util";

type ReqPagination = {
    limit: number,
    current_page: number, 
    skip: number,
    take: number,
}
type ForResponseParams = {
    pagination: ReqPagination,
    items_in_page: number,
    items_total: number,
}
type ForResponsePagination = {
    current_page: number,
    limit: number,
    items_in_page: number,
    items_total: number,
    total_pages: number,
}
export class ReqPaginator {
    static get = (req: NextApiRequest) : ReqPagination => {
        //Limit 
        const limit : number = (req.query.limit) ? Number(req.query.limit) : 20
        
        //Current Page
        let current_page : number = (req.query.page && !isNaN(Number(req.query.page)) && Number(req.query.page)>0) ? Number(req.query.page) : 1
        //Avoiding below zero values
        return {
            current_page: current_page,
            limit: limit,
            take: limit,
            skip: limit*(current_page-1),
        }
    } 

    static forResponse(params: ForResponseParams) : ForResponsePagination{
        return {
            current_page: params.pagination.current_page,
            limit: params.pagination.limit,
            items_in_page: params.items_in_page,
            items_total: params.items_total,
            total_pages: Math.ceil(params.items_total/params.pagination.limit),
        }
    }
}