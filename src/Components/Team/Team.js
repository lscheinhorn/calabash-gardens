import './Team.css'
import { content } from '../../data/siteData'

export default function Team ({ teamContent = content.home.team }) {
    return (
        <div id="team">
            <h1>{ teamContent.title }</h1>
            <div id="team_main">
                <div id="position_1_container">
                    <img src={require("../../resources/images/president.webp")} alt="Claudel Chery" />
                    <div id="position_1">
                        <h3>{ teamContent.position_1.name }</h3>
                        <h4>{ teamContent.position_1.title }</h4>
                        <p>{ teamContent.position_1.bio }</p>
                    </div>
                </div>
                <div id="position_2_container">
                    <img src={require("../../resources/images/vice_president.webp")} alt="Jette Mandl-Abramson" />
                    <div id="position_2">
                        <h3>{ teamContent.position_2.name }</h3>
                        <h4>{ teamContent.position_2.title }</h4>
                        <p>{ teamContent.position_2.bio }</p>
                    </div>
                </div>
            </div>
        </div>
        
    )
}
