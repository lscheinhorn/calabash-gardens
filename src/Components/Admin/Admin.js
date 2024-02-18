import {  signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '../../firebase-config'
import { useState } from 'react'
import  Editor  from '../Editor/Editor'

export default function Admin () {
    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")
    const [ user, setUser ] = useState("")
    const uid = ["1PtSGU91GXRVssf17Y2lDReYes53", "IvIXfrqaoQZ4JkwgRLrcmSvnQVz1"]

    const handleSubmit = () => {
        console.log("email", email, "password", password)
        signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in 
            const user = userCredential.user;
            console.log("user", user)
            setUser(user)
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log("Error signing in", errorCode, errorMessage)
        });
    }
    
    const isAdmin = () => {
        return (user.uid === uid[0]) || (user.uid === uid[1])
    }

    return (
        <div id="admin">
            Admin

            <form onSubmit={ handleSubmit }>
                <input 
                    value={ email }
                    onChange={ (e) => { setEmail( e.target.value ) }}
                    name="email"
                    type='text'
                    placeholder="Email"
                />
                <input 
                    value={ password }
                    onChange={ (e) => { setPassword( e.target.value ) }}
                    name="password"
                    type='text'
                    placeholder="Password"
                />
                <button type="submit">Sign In</button>
            </form>

            { isAdmin() ? <Editor user={ user }/> : null }
        </div>
    )
} 