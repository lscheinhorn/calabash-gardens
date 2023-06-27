import './Contact.css'
import React, { useState, useRef } from 'react';
import emailjs from '@emailjs/browser';
 
export default function Contact() {
    const formRef = useRef();
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
        emailjs.sendForm('service_6n5ow3f', 'template_9y2c7vf', formRef.current, 'anRu1WXRFLGM58t0y')
        .then((result) => {
         // show the user a success message
         console.log("success", result)
         if(result.text === "OK") {
            
            // reset form and send success message
            setForm( () => {
                return {
                    from_name: "",
                    user_email: "",
                    phone: "",
                    message: "",
                    sent: true
                }
            })
         }
        }, (error) => {
         // show the user an error
         console.log("error sending message", error)
         setForm(prev => {
            return {
                ...prev,
                sent: error
            }
        })
        })
    }

    return (
        <form ref={ formRef } onSubmit={ sendEmail }>
            <div className="form-group">
                <label>Name</label>
                <input 
                    className="form-control" 
                    type="text" 
                    name="from_name" 
                    value={ form.from_name } 
                    onChange={ handleChange }
                    required
                />
                <label>Email address</label>
                <input 
                    className="form-control" 
                    type="email"
                    name="user_email" 
                    value={ form.user_email} 
                    onChange={ handleChange }
                    required
                />
                <small id="emailHelp" className="form-text text-muted">We'll never share your email with anyone else.<br></br></small>
                <label>Phone</label>
                <input 
                    className="form-control" 
                    type="tel" 
                    name="phone" 
                    value={ form.phone } 
                    onChange={ handleChange }
                    required
                />
                <label>Message</label>
                <textarea 
                    className="form-control" 
                    name="message" 
                    value={ form.message } 
                    onChange={ handleChange }
                    required
                />
                <input 
                    id="send_button"
                    className="btn btn-primary" 
                    type="submit" 
                    value="Send" 
                />
            </div>
            { form.sent === true ? <h4>Your message was sent successfully!</h4> : null }
            { form.sent === 'error' ? <h4>There was an error sending your message. Please try again or email us directly at calabashgardens@gmail.com </h4> : null }

        </form>
    )
}

 
