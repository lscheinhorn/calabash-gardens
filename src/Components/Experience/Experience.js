import './Experience.css'
import React from 'react';
import { Link } from 'react-router-dom';


export default function Experience() {
    return (
        <div className="events">
            <div className="events-container">
                <Link to="/events">
                    <h1 className="text-center">The Calabash Experience</h1>
                    <img className="img-fluid mx-auto d-block" src={require("../../resources/images/The_Calabash_Experience.jpg")} alt="Jette Mandl-Abramson" />
                </Link>
            </div>
        </div>
    );
}