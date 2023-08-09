
const defaultInfo = "I'm a product detail. I'm a great place to add more information about your product such as sizing, material, care and cleaning instructions. This is also a great space to write what makes this product special and how your customers can benefit from this item."

const createKey = (input) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ-1234567890.,'
    const numbers = Array.prototype.map.call(input, (char) => {
      const number = chars.indexOf(char)
      return number > -1 ? number : chars.length
    })
    return numbers.join('')
  }

export const products = [
    {
        title: 'Calabash Holidays Gifts Basket',
        info: defaultInfo,
        price: '100.00',
        shipping: '15.00',
        isHighlighted: false,
        photos: [
            require('../resources/images/product_photos/holidays_gifts_basket.webp')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Calabash Gifts Basket',
        info: defaultInfo,
        price: '100.00',
        shipping: '15.00',
        isHighlighted: false,
        photos: [
            require('../resources/images/product_photos/gifts_basket.webp')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Calabash Gift Basket',
        info: defaultInfo,
        price: '50.00',
        shipping: '15.00',
        isHighlighted: false,
        photos: [
            require('../resources/images/product_photos/gift_basket.webp')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Calabash Experience, Farm to Table Dinner',
        info: `On September 2nd, 2023 Calabash is hosting a farm to table fine dining experience for your culinary pleasure. Featuring Chef Micheal Clancy, with every dish featuring Calabash Gardens saffron, local spirits with herbal infusion pairings, mocktails if preferred.  All produce and meats featured are from some of our favorite local farms such as Hogwash Farm in Norwich, Crooked Mile Cheese in Waterford, Joes Brook Farm in Barnet, Honeywilya Salmon caught in Alaska and distributed out of Duxbury and walnuts from the Sweet Cow located here in Newbury. Spirits from our favorite local distilleries Silo in Windsor and Bar Hill in Montpelier and coffee from Upper Valley Coffee Roasters also right here in Newbury. Live music to be announced. The cost of the evening is $90, $50 non refundable deposit per person will hold your reservation and $40 per person at time of service. Gratuities are appreciated. We have limited seating with a maximum of 20 guests so make sure to claim your spot! We are so looking forward to hosting you, let's have an incredible evening of the highest quality local food and drink!`,
        info1: `On September 2nd, 2023 Calabash is hosting a farm to table fine dining experience for your culinary pleasure. Featuring Chef Micheal Clancy, with every dish featuring Calabash Gardens saffron,  `,
        info2: `local spirits with herbal infusion pairings, mocktails if preferred.  All produce and meats featured are from some of our favorite local farms such as Hogwash Farm in Norwich, Crooked Mile Cheese in Waterford, Joes Brook Farm in Barnet, Honeywilya Salmon caught in Alaska and distributed out of Duxbury and walnuts from the Sweet Cow located here in Newbury. Spirits from our favorite local distilleries Silo in Windsor and Bar Hill in Montpelier and coffee from Upper Valley Coffee Roasters also right here in Newbury. Live music to be announced. The cost of the evening is $90, $50 non refundable deposit per person will hold your reservation and $40 per person at time of service. Gratuities are appreciated. We have limited seating with a maximum of 20 guests so make sure to claim your spot! We are so looking forward to hosting you, let's have an incredible evening of the highest quality local food and drink!`,
        link: require("../resources/Menu.docx.pdf"),
        price: '50.00',
        shipping: '0.00',
        isHighlighted: true,
        photos: [
            require('../resources/images/product_photos/event_night.jpg'),
        ],
        get key() {
            return createKey(this.title)
        }
    },

    {
        title: '0.5g Vermont Grown Saffron',
        info: "A half gram of our regeneratively grown, organic saffron.",
        price: '40.00',
        shipping: '15.00',
        isHighlighted: true,
        photos: [
            require('../resources/images/product_photos/0.5g_vermont_grown_saffron_1.webp'),
            require('../resources/images/product_photos/0.5g_vermont_grown_saffron_2.webp'),
            require('../resources/images/product_photos/0.5g_vermont_grown_saffron_3.webp')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: '1g VT Grown Saffron',
        info: "One gram of our regeneratively grown, organic saffron.",
        price: '60.00',
        shipping: '15.00',
        isHighlighted: false,
        photos: [
            require('../resources/images/product_photos/1g_vt_grown_saffron.webp')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: '2g VT Grown Saffron',
        info: "two grams of our regeneratively grown, organic saffron.",
        price: '110.00',
        shipping: '15.00',
        isHighlighted: true,
        photos: [
            require('../resources/images/product_photos/2g_vt_grown_saffron_1.webp'),
            require('../resources/images/product_photos/2g_vt_grown_saffron_2.webp')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Saffron Tincture',
        info: "Our saffron tincture is an excellent way to ingest all the medicinal benefits of saffron while.",
        price: '20.00',
        shipping: '15.00',
        isHighlighted: false,
        photos: [
            require('../resources/images/product_photos/saffron_tincture.webp')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Saffron Maple Syrup',
        info: defaultInfo,
        price: '15.00',
        shipping: '15.00',
        isHighlighted: false,
        photos: [
            require('../resources/images/product_photos/saffron_maple_sirup.webp')
        ],
        get key() {
            return createKey(this.title)
        }
    }
]

