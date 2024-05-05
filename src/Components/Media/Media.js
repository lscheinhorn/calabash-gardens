import './Media.css'

export default function Media () {
    
    return (
        <div>
            <div className=" events d-flex align-items-center justify-content-center">
                
                <iframe 
                    className="youtube"
                
                    src="https://www.youtube.com/embed/6kM92Zkr2lk?si=TsQip8wOTTx7JA_s&amp;start=323&end=532&rel=0" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    >
                </iframe>
        </div>

        <a 
            className="d-block text-center fs-4 p-4"
            target="blank" 
            href="https://youtu.be/6kM92Zkr2lk?si=gARkuIvKEGVfIXJr"
        >Watch the full video here</a>
                
        </div>
        
    )
}