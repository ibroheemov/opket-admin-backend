import dayjs from "dayjs";
import { OrderCounterModel } from "../models/CounterModel";

export const getNextOrderNumber = async (restaurantId: string) => {
    const today = dayjs().format("YYYY-MM-DD");

    const counter = await OrderCounterModel.findOneAndUpdate(
        { restaurantId, date: today },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    return {
        orderNumber: counter.seq,
        orderDate: today
    };
};