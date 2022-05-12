import './Product.css'

export default function Product (props) {
    const { product } = props
    const photos = product.photos.map(photo => {
        return `../../resources${photo}`
    })
    const featured = photos[0]
    const { title, info, price } = product

    return (
        <div>
            <img src={ featured } alt={ title } />
            <h4>{ title }</h4>
            <p>{ info }</p>
            <p>{ price }</p>
        </div>
    )
}