import dayjs from "dayjs";
import { ClientSession } from "mongoose";
import { OrderCounterModel } from "../models/CounterModel";

export const getNextOrderNumber = async (
    restaurantId: string,
    session?: ClientSession
) => {
    const today = dayjs().format("YYYY-MM-DD");

    const counter = await OrderCounterModel.findOneAndUpdate(
        { restaurantId, date: today },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session }
    );

    return {
        orderNumber: counter.seq,
        orderDate: today
    };
};