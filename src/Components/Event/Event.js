import './Event.css'
import { Link } from 'react-router-dom'

export default function Event () {
    return (
        <div id="event">
            <h1>Calabash Experience, Farm to Table Dinner</h1>
            <p>On September 2nd, 2023 Calabash is hosting a farm to table fine dining experience for your culinary pleasure. Featuring Chef Micheal Clancy, with every dish featuring Calabash Gardens saffron, local spirits with herbal infusion pairings, mocktails if preferred.  All produce and meats featured are from some of our favorite local farms such as Hogwash Farm in Norwich, Crooked Mile Cheese in Waterford, Joes Brook Farm in Barnet, Honeywilya Salmon caught in Alaska and distributed out of Duxbury and walnuts from the Sweet Cow located here in Newbury. Spirits from our favorite local distilleries Silo in Windsor and Bar Hill in Montpelier and coffee from Upper Valley Coffee Roasters also right here in Newbury. Live music to be announced. The cost of the evening is $90, $50 non refundable deposit per person will hold your reservation and $40 per person at time of service. Gratuities are appreciated. We have limited seating with a maximum of 20 guests so make sure to claim your spot! We are so looking forward to hosting you, let's have an incredible evening of the highest quality local food and drink!     </p>
            <p></p>
            <Link to="contact">
                <button className="btn btn-primary" aria-label="Get In Touch" >Book Now</button>
            </Link>
        </div>
    )
}