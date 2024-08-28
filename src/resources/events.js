







const defaultPhoto = require('../resources/images/large_logo_no_purple_square.png')








export const createKey = (input) => {
 const chars = 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ-1234567890.,'
 const numbers = Array.prototype.map.call(input, (char) => {
   const number = chars.indexOf(char)
   return number > -1 ? number : chars.length
 })
 return numbers.join('')
}












export const experienceBlurb = [
  `The Calabash Experience is our way to bring the finest quality Calabash saffron, wild foraged foods, organic produce and regeneratively grown meats from hyper local farms to your plate in the most beautiful ways. We are harboring a space for creativity, diversity and culture with an air of accessibility, it’s easier than you may think to eat local and eat well. With Jette’s two decade run in the service industry it only felt right to begin hosting Elevated Farm to Plate Experiences on the lush lawn of our farm house, serving up the finest, healthiest and most local ingredients possible all with a saffron forward mindset. We are purveyors of fine foods and spirits, of a regenerative and responsible nature, with a flare for the diverse and unexpected. We feature as many Chefs as we can, highlighting their unique cultural heritage and allowing them total creativity in what they bring to the table. Our two requirements are that the menus they create are saffron forward, inviting our guests to enjoy a unique experience duplicated nowhere else, and all aspects be made in house with only the finest quality local ingredients. Using wildcrafted, organic and regeneratively  grown meats and produce allows us to present a completely sustainable experience while also maintaining a  superior level of health for guests and the planet alike. We are merging accessibility, diversity, uniqueness, health and above all flavor, for an incredible evening of food, spirits, and of course most of all enjoyment!`,
  `There are 30 seats available for each seating of the Calabash Experiences in 2024. We can accommodate Vegetarians and Gluten Free for most of our meals, please hit the Vegetarian or Gluten Free options when purchasing tickets. There is an additional $10 fee for either or both options. We may not be able to do Gluten Free or Vegetarian for every Experience, please check the descriptions. If you are purchasing a mix of meat, veggie or gluten free please make sure you have picked the correct option before clicking buy tickets, and check again once in the cart.`,
`Events are held at 1831 Fish Pond Rd Wells River Vermont 05081. Arrival time is 5pm with seating at 5:30pm. Menus are subject to change depending on local availability and seasonality.`,
  `The Calabash Gardens team works incredibly hard to bring these events to you, in light of all the hard work we do, and the associated cost of these events, 50% of the ticket price is charged at time of purchase with no refund available. The second 50% is taken at time of arrival as you check in. Thank you for understanding. Gratuities are appreciated for our incredibly hard working staff, tips are split evenly between all function employees.`
	
]




export const events = [
  {
     title: 'Calabash Experience, Chef Mike Clancy',
     category: "Experience",
     info: [
         `On September 2nd, 2023 Calabash is hosting a farm to table fine dining experience for your culinary pleasure. Featuring Chef Micheal Clancy, with every dish featuring Calabash Gardens saffron.`,
         `Local spirits with herbal infusion pairings, mocktails if preferred.  All produce and meats featured are from some of our favorite local farms such as Hogwash Farm in Norwich, Crooked Mile Cheese in Waterford, Joes Brook Farm in Barnet, Honeywilya Salmon caught in Alaska and distributed out of Duxbury and walnuts from the Sweet Cow located here in Newbury. Spirits from our favorite local distilleries Silo in Windsor and Bar Hill in Montpelier and coffee from Upper Valley Coffee Roasters also right here in Newbury. Live music to be announced. The cost of the evening is $90, $50 non refundable deposit per person will hold your reservation and $40 per person at time of service. Gratuities are appreciated. We have limited seating with a maximum of 20 guests so make sure to claim your spot! We are so looking forward to hosting you, let's have an incredible evening of the highest quality local food and drink!`
     ],
     // Date must be as follows: Date(year, month, day) format with month starting at index 0 for January
     date: new Date(2023, 8, 2),
     eventDates: [
          "September 2nd, 2023",
      ],
      link: require("../resources/Menu.docx.pdf"),
      priceOptions: ['90.00'],
      shipping: '0.00',
      isActive: true,
      inStock: false,
      photos: [
         require('../resources/images/product_photos/event_night.jpg'),
      ],
      get key() {
         return createKey(this.title)
      }
  },
  {
      title: `Ma-Der! Ma-Der! \nLao Cuisine By Chef Mary and Phet`,
      category: "Experience",
      info: [
          `July 5th Calabash Will be hosting a unique Lao experience. Chefs Phet and Mary will be using saffron in a coursed out traditional Lao meal featuring incredible local ingredients and cocktail or mocktail pairings. The Experience can accommodate both Vegetarian and Gluten free. A 50% non refundable deposit of $55 to book your seats, the second $55 is payed at time of event.`,
          `Meet your Chefs!`,
          `Phet Keomanyvahn grew up in the Northeast Kingdom and graduated from St. Johnsbury Academy. She went on to obtain her B.A. in Anthropology at The University of North Carolina-Greensboro and then her M.A. in Public Administration at the University of Vermont. She currently works for the City and Burlington as Program Manager in the Racial Equity, Inclusion and Belonging Office to further advance the City’s diversity and equity goals. Phet enjoys spending her time with family and friends, hiking, practicing yoga, and foraging with her dog Moo `,
          `Mary Nasouluk-G works in finance and received her bachelor’s degree from the University of North Carolina in Accounting. Born and raised in Boston to Lao immigrants, a sense of community was built around cooking and sharing Laos food. Her family prepared staple Laos dishes for gatherings and local community events. She continues this tradition with her two sons by sharing their culture through cooking.`,
       ],
       // Date must be as follows: Date(year, month, day) format with month starting at index 0 for January
      date: new Date(2024, 5, 5),
      eventDates: [
          "",
      ],
      link: require("../resources/images/Ma-Der_Ma-Der_Menu.pdf"),
      priceOptions: ['55.00'],
      shipping: '0.00',
      isActive: true,
      inStock: false,
      photos: [
          require('../resources/images/Moo_and_Mom_Fall_Joy_.jpg'),
          require('../resources/images/Mary_and_boys.jpg'),




      ],
      get key() {
          return createKey(this.title)
      }
 },
 {
      title: 'Fleur De Mar \nby Chef Cole Conrad Cohen',
      category: "Experience",
      info: [
          `August 2nd and 3rd 2024 Chef Cole Conrad Cohen is bringing the fruits of the sea to central Vermont! Each Course of this incredible seven course meal is filled to the brim with the freshest seafood the Atlantic has to offer Calabash Gardens Saffron and the incredible pairing of local wine with each course. This will be an event you will not want to miss. Book for either Friday or Saturday night or both if you're feeling like you need a lot of seafood in your life. This Experience can be Gluten Free and Vegetarian. A 50% non refundable deposit of $80 to book your seats, the second $80 is payed at time of event.`,
          `Meet your Chef!`,
          `Cole Conrad Cohen has been practicing culinary arts for over 30 years starting out at a catering gig when he was 13, since then Cole has run the gamut of the local restaurant scene. He has been involved with a majority of the seacoast Maine and New Hampshire restaurant styles including South Asian, African, Mexican, French, Caribbean, Vegan, Southern Soul, Creole and Italian. On days outside the Kitchen he spends his time reading and educating himself on food, history and hospitality, foraging and new geographically specific cooking techniques. He has volunteered in many kitchens and worked in multiple pop-ups. He started his first Executive position in his hometown, Bakery Forward Bistro and Beer Garden during his tenure as a fine dining chef at restaurants in Portsmouth NH. He has worked with the James Beard Awards Foundation as their private chef and for artists in residence. Cole has opened a half dozen restaurants including two of his own and currently owns the Foodio Private Chef's Table Experience LLC. Cole was the head Chef at the largest smokehouse in Maine for over a year, running the 20k sq ft space often alone with plans in the works for a new Breakfast Pop-Up in Portland at the award winning hand-made artisan restaurant he is currently employed with.`   
      ],




      // Date must be as follows: Date(year, month, day) format with month starting at index 0 for January
      date: new Date(2024, 7, 2),
      eventDates: [
          "August 2nd 2024",
          "August 3rd 2024",
      ],
      link: require("../resources/images/Fluer_De_Mar.pdf"),
      priceOptions: ['80.00'],
      shipping: '0.00',
      isActive: true,
      inStock: true,
      photos: [
          require('../resources/images/cole_photo.jpg'),
      ],
      get key() {
          return createKey(this.title)
      }
  },
  {
      title: 'Chuseok \nby Mountain Song Kitchen',
      category: "Experience",
      info: [
          `For one night only we have Mountain Song Kitchen from Newbury, VT hosting this experience, welcome to Chuseok! A traditionally based Korean meal fussed with a saffron forward theme, an experience never before tasted! Book this experience today for a first in a lifetime flavor mash up. This Experience can accommodate Vegetarian but not gluten free. A 50% non refundable deposit to book your seats, the second half is payed at time of event.`,          
    `Meet your Chef!`,
          `My Mother is a chef and in our household sharing food with friends and family was an integral part of the day. The importance of food, the time spent preparing it and the time we shared enjoying it was instilled in me at a young age. As a teenager I started working in the food industry and over the course of the next ten years I worked up from dishwasher to chef. Seven years ago I decided to take a break from working in kitchens and reevaluate, and reassess my relationship with the industry and with Korean food in particular. I was curious about how I could honor the traditions of Korean cuisine while also accommodating the western palette. Most importantly, having started this business with Jesa, I've been having a pretty good time. -Driscoll`,
          `Moving to Vermont and starting a garden has helped my husband and I tie our cuisine to the food source. We began using korean natural farming and organic methods in our garden. The focus of our garden inputs are sourced through foraging and using food waste to cultivate specific fertilizers, indigenous microorganisms, healthy bacteria and fungi for soil health. The garden feeds the kitchen, feeds the garden, feeds the kitchen. -Jesa`,  
      ],




      // Date must be as follows: Date(year, month, day) format with month starting at index 0 for January
      date: new Date(2024, 7, 6),
      eventDates: [
          
      ],
      link: require("../resources/images/Mountain_Song_Menu.png"),
      priceOptions: ['55.00'],
      shipping: '0.00',
      isActive: true,
      inStock: false,
      photos: [
          require('../resources/images/Driscoll_and_Jesa.jpg'),
      ],
      get key() {
          return createKey(this.title)
      }
   },
   {
      title: 'A Taste of Season in Vermont \nby Chefs Samantha Langevin and Jeannie Kovacs',
      category: "Experience",
      info: [
       ` October 5th Samantha Langevin and Jeannie Kovacs are bringing to Calabash a power packed menu full of unique mediterranean themed vermont grown courses paired with cocktails to spotlight the early fall colors and flavors. Come welcome autumn with the warm flavor of saffron and the gifts of the land!.`,   
`Samantha Langevin and Jeannie Kovacs are a daughter & mother who have spent more time eating together than anything else they can think of. Jeannie raised Samantha and her siblings in Vermont and Texas in a household that required adventurous eaters, with Samantha’s formative food memories including coquilles St Jacques, homemade tacos, pan fried trout, and the best birthday cakes.
Samantha has worked as a chef in farm to table dining for over 10 years, getting her start in the Bay Area of California before returning to Vermont. Most recently the Chef de Cuisine at American Flatbread, Middlebury Hearth, she now works for The Vermont Releaf Collective, helping in its mission to amplify the voices of BIPOC in Land, Environment, Agriculture, & Food. She lives on a small farm with her partner and will enthusiastically discuss Vermont cheese with
anyone who cares to listen.`,
`Jeannie has straddled many worlds professionally, including work within Tribal government, non profit leadership, and fine dining as a Pastry Chef. She currently is the Executive Director of Krossroads, which provides wrap-around integrative health and recovery solutions. Jeannie is a lifelong member of the National Association for the Education of Young Children (NAEYC), Society for Advancement of Native Americans and Chicanos in Science (SACNAS), and TEWA Women United. She will absolutely make you a birthday to remember, no matter how many food allergies you have.`,  
      ],




      // Date must be as follows: Date(year, month, day) format with month starting at index 0 for January
      date: new Date(2024, 9, 5),
      eventDates: [
          "October 5th 2024",
      ],
      link: require("../resources/images/a_taste_of_season.pdf"),
      priceOptions: ['55.00'],
      shipping: '0.00',
      isActive: true,
      inStock: true,
      photos: [
          require('../resources/images/samantha_and_jeannie.jpg'),
      ],
      get key() {
          return createKey(this.title)
      }
   },
 
]



























































