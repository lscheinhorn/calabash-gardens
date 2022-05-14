import './Team.css'
import { content } from '../../resources/content'

export default function Team () {
    return (
        <div id="team">
            <h1>{ content.home.team.title }</h1>
            <div id="team_main">
                <div id="position_1_container">
                    <img src="images/president.webp" alt="Claudel Chery" />
                    <div id="position_1">
                        <h3>{ content.home.team.position_1.name }</h3>
                        <h4>{ content.home.team.position_1.title }</h4>
                        <p>{ content.home.team.position_1.bio }</p>
                    </div>
                </div>
                <div id="position_2_container">
                    <img src="images/vice_president.webp" alt="Jette Mandl-Abramson" />
                    <div id="position_2">
                        <h3>{ content.home.team.position_2.name }</h3>
                        <h4>{ content.home.team.position_2.title }</h4>
                        <p>{ content.home.team.position_2.bio }</p>
                    </div>
                </div>
            </div>
        </div>
        
    )
}