
const defaultInfo = ""

const defaultPhoto = require('../resources/images/large_logo_no_purple_square.png')

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
        title: 'Test basket',
        category: "All",
        info: defaultInfo,
        priceOptions: [{price: '0.10'}],
        shipping: '0.00',
        isHighlighted: false,
        isActive: false,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Calabash Holidays Gift Set',
        category: "Gifts",
        info: defaultInfo,
        priceOptions: [{price: '100.00'}],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            require('../resources/images/product_photos/holidays_gifts_basket.webp')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Calabash Gifts Set',
        category: "Gifts",
        info: defaultInfo,
        priceOptions: [{price: '100.00'}],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            require('../resources/images/product_photos/gifts_basket.webp')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    
    {
        title: 'Calabash Gift Set',
        category: 'Gifts',
        info: defaultInfo,
        priceOptions: [{price: '50.00'}],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            require('../resources/images/product_photos/gift_basket.webp')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Spa Day Gift Set',
        category: 'Gifts',
        info: defaultInfo,
        priceOptions: [{price: '50.00'}],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            require('../resources/images/product_photos/gift_basket.webp')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Erotic Gift Set',
        category: 'Gifts',
        info: defaultInfo,
        priceOptions: [{price: '100.00'}],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            require('../resources/images/product_photos/gift_basket.webp')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Saffron Maple Syrup',
        category: 'Saffron',
        info: "Smooth sweet syrup, locally sourced and flavored with our saffron.",
        priceOptions: [{
            option: "4 oz", 
            price: '15.00'
        },
        {
            option: "8 oz", 
            price: '27.00'
        }],
        shipping: '15.00',
        isHighlighted: true,
        isActive: true,
        inStock: true,
        photos: [
            require('../resources/images/product_photos/saffron_maple_syrup.webp')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Saffron Honey',
        category: 'Saffron',
        info: "Raw honey, made by our bees and other local farms, with a touch of saffron",
        priceOptions: [{
            option: "4 oz", 
            price: '17.00'
        },
        {
            option: "8 oz", 
            price: '30.00'
        }],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Saffron Simple Syrup',
        category: 'Saffron',
        info: "Add saffron to your cocktails with our saffron simple syrup.",
        priceOptions: [{
            option: "4 oz", 
            price: '15.00'
        },
        {
            option: "8 oz", 
            price: '30.00'
        }],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            require('../resources/images/product_photos/saffron_simple_syrup.jpg')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Saffron Salt 2 oz',
        category: 'Saffron',
        info: "Add saffron to your cocktails with our saffron simple syrup.",
        priceOptions: [{
            option: "2 oz", 
            price: '12.50'
        }],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },

    {
        title: 'Vermont Grown Saffron',
        category: 'Saffron',
        info: "Our regeneratively grown, organic saffron.",
        priceOptions: [
            {
                option: '1/2 Gram',
                price: '40.00'
            },
            {
                option: '1 Gram',
                price: '60.00'
            },
            {
                option: '2 Grams',
                price: '110.00'
            }
        ],
        shipping: '15.00',
        isHighlighted: true,
        isActive: true,
        inStock: true,
        photos: [
            require('../resources/images/product_photos/0.5g_vermont_grown_saffron_1.webp'),
            require('../resources/images/product_photos/0.5g_vermont_grown_saffron_2.webp'),
            require('../resources/images/product_photos/0.5g_vermont_grown_saffron_3.webp'),
            require('../resources/images/product_photos/1g_vt_grown_saffron.webp'),
            require('../resources/images/product_photos/2g_vt_grown_saffron_1.webp'),
            require('../resources/images/product_photos/2g_vt_grown_saffron_2.webp')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    
    {
        title: 'Saffron Tincture',
        category: 'Saffron',
        info: "Our saffron tincture is an excellent way to ingest all the medicinal benefits of saffron.",
        priceOptions: [{
            option: "1/2 oz",
            price: '20.00'
        },
        {
            option: "1 oz",
            price: '30.00'
        },
        {
            option: "4 oz",
            price: '110.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: true,
        isActive: true,
        inStock: true,
        photos: [
            require('../resources/images/product_photos/saffron_tincture.webp')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Oregano 1/2 0z',
        category: 'Culinary',
        info: "Farm fresh dehydrated herbs.",
        priceOptions: [{
            option: "1/2 oz",
            price: '10.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Tarragon 1/2 0z',
        category: 'Culinary',
        info: "Farm fresh dehydrated herbs.",
        priceOptions: [{
            option: "1/2 oz",
            price: '10.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Ramp Pesto Walnut',
        category: 'Culinary',
        info: "Pesto made with foraged wild leeks and walnuts. Subtle onion flavor.",
        priceOptions: [{
            option: "4 oz",
            price: '15.00'
        },
        {
            option: "8 oz",
            price: '30.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Ramp Pesto Pecan',
        category: 'Culinary',
        info: "Pesto made with foraged wild leeks and pecans. Subtle onion flavor.",
        priceOptions: [{
            option: "4 oz",
            price: '15.00'
        },
        {
            option: "8 oz",
            price: '30.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Habanero Salt 2 oz',
        category: 'Culinary',
        info: "An easy way to add habanero to any dish.",
        priceOptions: [{
            option: "2 oz",
            price: '10.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Thai Chili Salt 2 oz',
        category: 'Culinary',
        info: "An easy way to add Thai chili flavor to any dish.",
        priceOptions: [{
            option: "2 oz",
            price: '10.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Cilantro Salt 2 oz',
        category: 'Culinary',
        info: "An easy way to add cilantro to any dish.",
        priceOptions: [{
            option: "2 oz",
            price: '10.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Rose Sugar 2 oz',
        category: 'Culinary',
        info: "Organic sugar with a gentle rose flavor",
        priceOptions: [{
            option: "2 oz",
            price: '10.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Ginger Sugar 2 oz',
        category: 'Culinary',
        info: "Organic sugar with a gentle ginger spice flavor",
        priceOptions: [{
            option: "2 oz",
            price: '10.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Cranberry Honey',
        category: 'Culinary',
        info: "Locally sourced raw honey fermented with cranberry and other spices.",
        priceOptions: [{
            option: "4 oz",
            price: '15.00'
        },
        {
            option: "8 oz",
            price: '27.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Elderflower Elixir',
        category: 'Culinary',
        info: "Elder flower tinture mix with raw local honey to make elder flower cordials.",
        priceOptions: [{
            option: "4 oz",
            price: '15.00'
        },
        {
            option: "8 oz",
            price: '27.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },


    {
        title: 'Trinidad Saffron Trifecta 4 oz',
        category: 'Culinary',
        info: "Mild",
        priceOptions: [{
            option: "4 oz",
            price: '12.50'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Saffron Ghost in Trinidad 4 oz',
        category: 'Culinary',
        info: "Medium",
        priceOptions: [{
            option: "4 oz",
            price: '12.50'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Ghost of Saffron Carolina 4 oz',
        category: 'Culinary',
        info: "Hot like the devil just kissed your tongue",
        priceOptions: [{
            option: "4 oz",
            price: '12.50'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },


    {
        title: 'The Heart and Head 1/2 oz Loose Leaf Tea',
        category: 'Loose Leaf Tea',
        info: defaultInfo,
        priceOptions: [{
            option: "1/2 oz",
            price: '12.50'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            require('../resources/images/product_photos/the_heart_and_the_head.jpg')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Easy Does It 1/2 oz Loose Leaf Tea',
        category: 'Loose Leaf Tea',
        info: defaultInfo,
        priceOptions: [{
            option: "1/2 oz",
            price: '12.50'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Goddess Moon 1/2 oz Loose Leaf Tea',
        category: 'Loose Leaf Tea',
        info: defaultInfo,
        priceOptions: [{
            option: "1/2 oz",
            price: '12.50'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Brainiac 1/2 oz Loose Leaf Tea',
        category: 'Loose Leaf Tea',
        info: defaultInfo,
        priceOptions: [{
            option: "1/2 oz",
            price: '12.50'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Wild Fire Frenzy 1/2 oz Loose Leaf Tea',
        category: 'Loose Leaf Tea',
        info: defaultInfo,
        priceOptions: [{
            option: "1/2 oz",
            price: '12.50'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Cold N Flu 1/2 oz Loose Leaf Tea',
        category: 'Loose Leaf Tea',
        info: defaultInfo,
        priceOptions: [{
            option: "1/2 oz",
            price: '12.50'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Milk Machine 1/2 oz Loose Leaf Tea',
        category: 'Loose Leaf Tea',
        info: defaultInfo,
        priceOptions: [{
            option: "1/2 oz",
            price: '12.50'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Sweet Relief 1/2 oz Loose Leaf Tea',
        category: 'Loose Leaf Tea',
        info: defaultInfo,
        priceOptions: [{
            option: "1/2 oz",
            price: '12.50'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Saffron Macha 1/2 oz Loose Leaf Tea',
        category: 'Loose Leaf Tea',
        info: defaultInfo,
        priceOptions: [{
            option: "1/2 oz",
            price: '12.50'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Tea Ball 1/2 oz Loose Leaf Tea',
        category: 'Loose Leaf Tea',
        info: defaultInfo,
        priceOptions: [{
            option: "1/2 oz",
            price: '12.50'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },


    {
        title: 'Sizzle',
        category: 'Mambo Gede',
        info: defaultInfo,
        priceOptions: [{
            option: "3/8 dram",
            price: '5.00'
        },
        {
            option: "5 ml",
            price: '7.00'
        },
        {
            option: "10 ml",
            price: '12.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Sippery Daze 4 oz',
        category: 'Mambo Gede',
        info: defaultInfo,
        priceOptions: [{
            option: "4 0z",
            price: '55.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Rara Magic',
        category: 'Mambo Gede',
        info: defaultInfo,
        priceOptions: [{
            option: "1 0z",
            price: '30.00'
        },
        {
        option: "4 0z",
        price: '55.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },

    {
        title: "Honey Don't You Glow, Clay Mask 4 0z" ,
        category: 'Body Care',
        info: "Kaolin clay mask, made with organanic ingredients that leaves your skin fresh and smooth.",
        priceOptions: [{
            option: "4 0z",
            price: '10.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },

    {
        title: "Soaking Salts 5 0z" ,
        category: 'Body Care',
        info: "Ease your muscles with our floral soaking salts",
        priceOptions: [{
            option: "5 0z",
            price: '12.50'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Ageless Beauty Butter' ,
        category: 'Body Care',
        info: "A body butter made with local herbs that act like collagen to reduce the appearance wrinkles.",
        priceOptions: [{
            option: "2 0z",
            price: '25.00'
        },
        {
            option: "4 0z",
            price: '42.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            require('../resources/images/product_photos/ageless_beauty_body_butter.jpg')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Ageless Beauty Oil 4 0z' ,
        category: 'Body Care',
        info: "A body oil made with local herbs that act like collagen to reduce the appearance wrinkles.",
        priceOptions: [{
            option: "4 0z",
            price: '37.00'
        },
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Bath Bombs' ,
        category: 'Body Care',
        info: defaultInfo,
        priceOptions: [{
            option: "",
            price: '10.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: false,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Great Green Heal',
        category: 'Body Care',
        info: defaultInfo,
        priceOptions: [{
            option: "2 oz",
            price: '25.00'
        },
        {
            option: "4 oz",
            price: '40.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: false,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: 'Heal All',
        category: 'Body Care',
        info: "This salve made from local herbs, coconut oil and beeswax. Naure's #1 bacterial defence.",
        priceOptions: [{
            option: "2 oz",
            price: '25.00'
        },
        {
            option: "4 oz",
            price: '40.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Itch Don't Bug Me Now 10 ml",
        category: 'Body Care',
        info: "Roll on antihistamine for hives and bug bites.",
        priceOptions: [{
            option: "10 ml",
            price: '10.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Fungus Among Us 2 oz",
        category: 'Body Care',
        info: defaultInfo,
        priceOptions: [{
            option: "2 oz",
            price: '25.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: false,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Lip Balm 1/2 oz",
        category: 'Body Care',
        info: "Super hydrating chapstick",
        priceOptions: [{
            option: "1/2 oz",
            price: '10.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Hydration Station",
        category: 'Body Care',
        info: "The ultimate moisturizing salve formula.",
        priceOptions: [{
            option: "2 oz",
            price: '25.00'
        },
        {
            option: "4 oz",
            price: '42.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Meadow Magic Gardener's Balm",
        category: 'Body Care',
        info: "Excelent choice for hard working hands",
        priceOptions: [{
            option: "2 oz",
            price: '25.00'
        },
        {
            option: "4 oz",
            price: '42.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Pain B Gone",
        category: 'Body Care',
        info: "A salve for achy joints and muscles.",
        priceOptions: [{
            option: "2 oz",
            price: '25.00'
        },
        {
            option: "4 oz",
            price: '42.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Silky Smooth Flower Balm",
        category: 'Body Care',
        info: "A salve that harnesses the power of wild flowers to repair and hydrate over worked skin.",
        priceOptions: [{
            option: "2 oz",
            price: '25.00'
        },
        {
            option: "4 oz",
            price: '42.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Sunny Days, Massage Oil 4 oz",
        category: 'Body Care',
        info: "Long lasting message oil, harnessing the powers of dandelion and violet.",
        priceOptions: [{
            option: "4 oz",
            price: '37.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "BO? Not Today, Deoderant Spray 4 oz",
        category: 'Body Care',
        info: "Natural spray-on deoderant.",
        priceOptions: [{
            option: "4 oz",
            price: '37.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Bug Spray 4 oz",
        category: 'Body Care',
        info: "A natural bug spray made with a potent mix of bug repelling herbs",
        priceOptions: [{
            option: "4 oz",
            price: '37.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Facial Toner",
        category: 'Body Care',
        info: "A gentle cleansing and pore minimizing herbal formula.",
        priceOptions: [{
            option: "1 oz",
            price: '15.00'
        },
        {
            option: "4 oz",
            price: '35.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },


    {
        title: "Headache and Fever",
        category: 'Tinctures',
        info: "A fever reducer and herbal suppliment for headaches and migraines.",
        priceOptions: [{
            option: "1 oz",
            price: '20.00'
        },
        {
            option: "4 oz",
            price: '42.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Joint Health",
        category: 'Tinctures',
        info: "An anti-inflammatory with soft tissue restoration and pain releaver.",
        priceOptions: [{
            option: "1 oz",
            price: '20.00'
        },
        {
            option: "4 oz",
            price: '42.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Reishi Turkey Tail",
        category: 'Tinctures',
        info: "Full body tonic and immune system booster for health and well being.",
        priceOptions: [{
            option: "1 oz",
            price: '20.00'
        },
        {
            option: "4 oz",
            price: '42.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Allergy Relief",
        category: 'Tinctures',
        info: "A powerful antihistamine.",
        priceOptions: [{
            option: "1 oz",
            price: '20.00'
        },
        {
            option: "4 oz",
            price: '42.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Moon Beams and Day Dreams",
        category: 'Tinctures',
        info: "Herbal sleep suppliment that calms the mind.",
        priceOptions: [{
            option: "1 oz",
            price: '20.00'
        },
        {
            option: "4 oz",
            price: '42.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "A Touch of Sunshine",
        category: 'Tinctures',
        info: "St John's Wort herbal blend that for depression and anxiety",
        priceOptions: [{
            option: "1 oz",
            price: '20.00'
        },
        {
            option: "4 oz",
            price: '42.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Bitters",
        category: 'Tinctures',
        info: "Delicious way to start the digestive system while enjoying a cocktail.",
        priceOptions: [{
            option: "1 oz",
            price: '20.00'
        },
        {
            option: "4 oz",
            price: '42.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "The Root Cause Bitters",
        category: 'Tinctures',
        info: "Delicious way to start the digestive system while enjoying a cocktail.",
        priceOptions: [{
            option: "1 oz",
            price: '20.00'
        },
        {
            option: "4 oz",
            price: '42.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    
    {
        title: "Cold and Flu",
        category: 'Tinctures',
        info: defaultInfo,
        priceOptions: [{
            option: "1 oz",
            price: '20.00'
        },
        {
            option: "4 oz",
            price: '42.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            require('../resources/images/product_photos/cold_and_flu.jpg')
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Lions Share",
        category: 'Tinctures',
        info: defaultInfo,
        priceOptions: [{
            option: "1 oz",
            price: '20.00'
        },
        {
            option: "4 oz",
            price: '42.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Free the Pee",
        category: 'Tinctures',
        info: defaultInfo,
        priceOptions: [{
            option: "1 oz",
            price: '20.00'
        },
        {
            option: "4 oz",
            price: '42.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: false,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Goddess Moon",
        category: 'Tinctures',
        info: defaultInfo,
        priceOptions: [{
            option: "1 oz",
            price: '20.00'
        },
        {
            option: "4 oz",
            price: '42.00'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: false,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },


    {
        title: "Dream Weaver 1/2 oz",
        category: 'Ritual Smoking Blends',
        info: defaultInfo,
        priceOptions: [{
            option: "1/2 oz",
            price: '12.50'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },
    {
        title: "Original Blend 1/2 oz",
        category: 'Ritual Smoking Blends',
        info: defaultInfo,
        priceOptions: [{
            option: "1/2 oz",
            price: '12.50'
        }
        ],
        shipping: '15.00',
        isHighlighted: false,
        isActive: true,
        inStock: true,
        photos: [
            defaultPhoto
        ],
        get key() {
            return createKey(this.title)
        }
    },





    {
        title: 'Calabash Experience, Farm to Table Dinner',
        category: "Experience",
        info: `On September 2nd, 2023 Calabash is hosting a farm to table fine dining experience for your culinary pleasure. Featuring Chef Micheal Clancy, with every dish featuring Calabash Gardens saffron, local spirits with herbal infusion pairings, mocktails if preferred.  All produce and meats featured are from some of our favorite local farms such as Hogwash Farm in Norwich, Crooked Mile Cheese in Waterford, Joes Brook Farm in Barnet, Honeywilya Salmon caught in Alaska and distributed out of Duxbury and walnuts from the Sweet Cow located here in Newbury. Spirits from our favorite local distilleries Silo in Windsor and Bar Hill in Montpelier and coffee from Upper Valley Coffee Roasters also right here in Newbury. Live music to be announced. The cost of the evening is $90, $50 non refundable deposit per person will hold your reservation and $40 per person at time of service. Gratuities are appreciated. We have limited seating with a maximum of 20 guests so make sure to claim your spot! We are so looking forward to hosting you, let's have an incredible evening of the highest quality local food and drink!`,
        info1: `On September 2nd, 2023 Calabash is hosting a farm to table fine dining experience for your culinary pleasure. Featuring Chef Micheal Clancy, with every dish featuring Calabash Gardens saffron,  `,
        info2: `local spirits with herbal infusion pairings, mocktails if preferred.  All produce and meats featured are from some of our favorite local farms such as Hogwash Farm in Norwich, Crooked Mile Cheese in Waterford, Joes Brook Farm in Barnet, Honeywilya Salmon caught in Alaska and distributed out of Duxbury and walnuts from the Sweet Cow located here in Newbury. Spirits from our favorite local distilleries Silo in Windsor and Bar Hill in Montpelier and coffee from Upper Valley Coffee Roasters also right here in Newbury. Live music to be announced. The cost of the evening is $90, $50 non refundable deposit per person will hold your reservation and $40 per person at time of service. Gratuities are appreciated. We have limited seating with a maximum of 20 guests so make sure to claim your spot! We are so looking forward to hosting you, let's have an incredible evening of the highest quality local food and drink!`,
        link: require("../resources/Menu.docx.pdf"),
        priceOptions: [{price: '50.00'}],
        shipping: '0.00',
        isHighlighted: false,
        isActive: true,
        inStock: false,
        photos: [
            require('../resources/images/product_photos/event_night.jpg'),
        ],
        get key() {
            return createKey(this.title)
        }
    },
]

