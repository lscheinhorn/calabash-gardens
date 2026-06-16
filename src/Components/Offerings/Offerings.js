import { content } from '../../data/siteData'
import './Offerings.css'

export default function Offerings ({ offeringsContent = content.home.offerings }) {
    return (
        <div id="offerings">
            <h1>{ offeringsContent.title || "Offerings" }</h1>
            <p>{ offeringsContent.paragraph }</p>
            <div id="offerings-blocks">
                <div className="offerings-row">
                    <div className="offerings-block">
                        <h3>{ offeringsContent.box_1.title }</h3>
                        <p>{ offeringsContent.box_1.paragraph }</p>
                    </div>
                    <div className="offerings-block">
                        <h3>{ offeringsContent.box_2.title }</h3>
                        <p>{ offeringsContent.box_2.paragraph }</p>
                    </div>
                </div>
                <div className="offerings-row">
                    <div className="offerings-block">
                        <h3>{ offeringsContent.box_3.title }</h3>
                        <p>{ offeringsContent.box_3.paragraph }</p>
                    </div>
                    <div className="offerings-block">
                        <h3>{ offeringsContent.box_4.title }</h3>
                        <p>{ offeringsContent.box_4.paragraph }</p>
                    </div> 
                </div>
                             
            </div>
            
            <div>
                <p>{ offeringsContent.more_info }</p>
            </div>

        </div>
    )
}
