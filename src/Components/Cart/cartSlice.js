import { createSlice } from '@reduxjs/toolkit'


export const cartSlice = createSlice({
    name: 'cart',
    initialState: [],
    reducers: {
        addCartItem: (state, action) => {
            return [
                ...state,
                action.payload
            ]  
        },
        removeCartItem: (state, action) => {
            return state.filter( item => item.key !== action.payload.key)
        }
    }
})


export const selectCart = state => state.cart 

export const { addCartItem, removeCartItem } = cartSlice.actions
export default cartSlice.reducer