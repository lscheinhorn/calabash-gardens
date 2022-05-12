import './Banner.css'

export default function Banner () {
    return (
        <div className='banner'>
            <h1>Calabash Gardens</h1>
            <h4>Black, Women & Worker owned.<br></br>One Thread at a Time</h4>
            <div className='banner_p'>
                <p>We are a progressive, innovative and sustainably minded saffron farm in Wells River, Vermont. The Farm produces the highest quality, organically grown saffron in the Northeast while striving to uphold the ethics of regenerative agricultural practices. Transparent, passionate, and inspiring the farm promotes equal opportunity while demonstrating leadership in a blossoming and dynamic US spice industry.</p>
            </div>
            <div className='learn_more'>
                <button>Learn More</button>
            </div>
        </div>
    )
}