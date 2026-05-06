import { content } from '../resources/content'
import { events, experienceBlurb } from '../resources/events'
import { eventsInventory } from '../resources/inventory'
import { products, createKey } from '../resources/products'
import { keys } from '../resources/public_keys'

export {
  content,
  events,
  experienceBlurb,
  eventsInventory,
  products,
  createKey,
  keys
}

export const getHighlightedProducts = () => products.filter(product => product.isHighlighted && product.isActive === true)
export const getProductByKey = productKey => products.find(product => product.key === productKey)

export const getActiveEvents = () => events.filter(event => event.isActive)
