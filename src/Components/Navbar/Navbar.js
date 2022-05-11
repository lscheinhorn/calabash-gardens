import './Navbar.css'

export default function Navbar () {
    return (
        <div className="topnav">
            <a className="active" href="/">Home</a>
            <a href="#news">News</a>
            <a href="#contact">Contact</a>
            <a href="#about">About</a>
        </div>
    )
}