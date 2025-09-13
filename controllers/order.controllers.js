import { sendResponse } from "../middleware/utils";


//fetch order summary by date duration
export async function getOrderSummary(req, res) {
    const { userId, userType } = req.user
    const isSeller = userType.toLowerCase() === "seller" ? true : false;
    const { period } = req.params
    //allowed period values: today, custom days, custom week, custom month, custom year all
    
    try {
        let query = {}
        if(isSeller) {
            query.sellerId = userId
        } else {
            query.buyerId = userId
        }

        //get all orders of either the seller or buyer depending on user type
        //get the total order in that time deping on the period
        //get the total number of each status of the order at that time
        //e.g totalOrder = 10, pending =2, Processing, 3, Shipment = 2, Delivered  = 3, Cancelled = 0, Returned = 0

    } catch (error) {
        console.log('UNABLE TO FETCH ORDER SUMMARY', error)
        sendResponse(res, 500, false, null, 'Unable to fetch order summary')
    }
}