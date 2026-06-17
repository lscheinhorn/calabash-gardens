import './Team.css'
import { content } from '../../data/siteData'

const renderStaticContent = (fieldPath, label, children) => children;

export default function Team ({
    renderEditableContent = renderStaticContent,
    teamContent = content.home.team
}) {
    return (
        <div id="team">
            <h1>{ renderEditableContent('title', 'Team title', teamContent.title) }</h1>
            <div id="team_main">
                <div id="position_1_container">
                    <img src={require("../../resources/images/president.webp")} alt="Claudel Chery" />
                    <div id="position_1">
                        <h3>{ renderEditableContent('position_1.name', 'First team member name', teamContent.position_1.name) }</h3>
                        <h4>{ renderEditableContent('position_1.title', 'First team member title', teamContent.position_1.title) }</h4>
                        <p>{ renderEditableContent('position_1.bio', 'First team member bio', teamContent.position_1.bio) }</p>
                    </div>
                </div>
                <div id="position_2_container">
                    <img src={require("../../resources/images/vice_president.webp")} alt="Jette Mandl-Abramson" />
                    <div id="position_2">
                        <h3>{ renderEditableContent('position_2.name', 'Second team member name', teamContent.position_2.name) }</h3>
                        <h4>{ renderEditableContent('position_2.title', 'Second team member title', teamContent.position_2.title) }</h4>
                        <p>{ renderEditableContent('position_2.bio', 'Second team member bio', teamContent.position_2.bio) }</p>
                    </div>
                </div>
            </div>
        </div>
        
    )
}
