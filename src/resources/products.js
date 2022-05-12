const defaultInfo = 'I'm a product detail. I'm a great place to add more information about your product such as sizing, material, care and cleaning instructions. This is also a great space to write what makes this product special and how your customers can benefit from this item.'

const createKey = (input) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ-1234567890.,'
    const numbers = Array.prototype.map.call(input, (char) => {
      const number = chars.indexOf(char)
      return number > -1 ? number : chars.length
    })
    return numbers.join('')
  }

export const products = [
    holidays_gifts_basket: {
        title: 'Calabash Holidays Gifts Basket',
        info: defaultInfo,
        price: '$100.00',
        highlighted: false,
        photos: [
            './images/product_photos/holidays_gifts_basket.webp'
        ],
        get key() {
            return createKey(this.title)
        }
    },
    gifts_basket: {
        title: 'Calabash Gifts Basket',
        info: defaultInfo,
        price: '$100.00',
        highlighted: false,
        photos: [
            './images/product_photos/gifts_basket.webp'
        ],
        get key() {
            return createKey(this.title)
        }
    },
    gift_basket: {
        title: 'Calabash Gift Basket',
        info: defaultInfo,
        price: '$50.00',
        highlighted: false,
        photos: [
            './images/product_photos/gift_basket.webp'
        ],
        get key() {
            return createKey(this.title)
        }
    },
    0.5g_vermont_grown_saffron: {
        title: '0.5g Vermont Grown Saffron',
        info: defaultInfo,
        price: '$30.00',
        highlighted: true,
        photos: [
            './images/product_photos/0.5g_vermont_grown_saffron_1.webp',
            './images/product_photos/0.5g_vermont_grown_saffron_2.webp',
            './images/product_photos/0.5g_vermont_grown_saffron_3.webp'
        ],
        get key() {
            return createKey(this.title)
        }
    },
    1g_vt_grown_saffron: {
        title: '1g VT Grown Saffron',
        info: defaultInfo,
        price: '$50.00',
        highlighted: true,
        photos: [
            './images/product_photos/1g_vt_grown_saffron.webp'
        ],
        get key() {
            return createKey(this.title)
        }
    },
    2g_vt_grown_saffron: {
        title: '2g VT Grown Saffron',
        info: defaultInfo,
        price: '$100.00',
        highlighted: true,
        photos: [
            './images/product_photos/2g_vt_grown_saffron_1.webp',
            './images/product_photos/2g_vt_grown_saffron_2.webp'
        ],
        get key() {
            return createKey(this.title)
        }
    },
    saffron_tincture: {
        title: 'Saffron Tincture',
        info: defaultInfo,
        price: '$10.00',
        highlighted: false,
        photos: [
            './images/product_photos/saffron_tincture.webp'
        ],
        get key() {
            return createKey(this.title)
        }
    },
    saffron_maple_sirup: {
        title: 'Saffron Maple Sirup',
        info: defaultInfo,
        price: '$15.00',
        highlighted: false,
        photos: [
            './images/product_photos/saffron_maple_sirup.webp'
        ],
        get key() {
            return createKey(this.title)
        }
    }
]
