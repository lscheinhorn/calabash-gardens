import React, { useState } from 'react';
import emailjs from '@emailjs/browser';
 
export default function Contact() {
    // const form = useRef();
    const [ form, setForm] = useState({
        from_name: "",
        user_email: "",
        phone: "",
        message: "",
        sent: false
    })

    const handleChange = ({target}) => {
        const { name, value } = target
    
        setForm( (prev) => {
            return {
                ...prev,
                [name]: value,
                sent: false
            }
        })
    }

    const sendEmail = (e) => {
        e.preventDefault() // prevents the page from loading
        // emailjs.sendForm('service_6n5ow3f', 'template_9y2c7vf', form.current, 'anRu1WXRFLGM58t0y')
        // .then((result) => {
        //  // show the user a success message
        // }, (error) => {
        //  // show the user an error
        // })
        console.log("form", form)
        setForm({
            from_name: "",
            user_email: "",
            phone: "",
            message: "",
            sent: true
        })
        console.log("sent true?", form)
    }

    return (
        <form onSubmit={ sendEmail}>
            <div className="form-group">
                <label for="name">Name</label>
                <input 
                    className="form-control" 
                    type="text" 
                    name="from_name" 
                    value={ form.from_name } 
                    onChange={ handleChange }
                />
                <label for="exampleInputEmail1">Email address</label>
                <input 
                    className="form-control" 
                    type="email"
                    name="user_email" 
                    value={ form.user_email} 
                    onChange={ handleChange }
                />
                <small id="emailHelp" class="form-text text-muted">We'll never share your email with anyone else.<br></br></small>
                <label for="phone">Phone</label>
                <input 
                    className="form-control" 
                    type="tel" 
                    name="phone" 
                    value={ form.phone } 
                    onChange={ handleChange }
                />
                <label>Message</label>
                <textarea 
                    className="form-control" 
                    name="message" 
                    value={ form.message } 
                    onChange={ handleChange }
                />
                <input 
                    className="btn btn-primary" 
                    type="submit" 
                    value="Send" 
                />
            </div>
            { form.sent?<h4>Your message was sent</h4>:null }
        </form>
    )
}
 
