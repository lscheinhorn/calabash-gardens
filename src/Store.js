import { createStore } from 'redux'

const initialState = { cart: [] }

export const addCartItem = (product) => {
    return {
        type: 'cart/addCartItem',
        payload: product
    }
}

export const removeCartItem = (product) => {
    return {
        type: 'cart/removeCartItem',
        payload: product
    }
}

const cartReducer = (state = initialState, action) => {
    switch( action.type ) {
        case 'cart/addCartItem':
            return { 
                ...state, 
                cart: [
                    ...state.cart,
                    action.payload
                ]  
            }
        case 'cart/removeCartItem':
            return { 
                ...state, 
                cart: state.cart.filter( item => item.key !== action.payload.key)
            }
            
            
        default:
            return state
    }
}

const store = createStore(cartReducer)

export const selectCart = state => state.cart 

export default store