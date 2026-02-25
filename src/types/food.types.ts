export interface OrderFoodTypes {
    restaurantId: number;
    items: MenuItemType[]
}

export interface MenuItemType {
    menuItemId: string;
    quantity: number
}
