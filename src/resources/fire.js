// import { useState, useEffect } from 'react'
// import { db } from '../firebase-config'
// import { collection, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore'

// const [newLink, setNewLink] = useState ('')
// const [newName, setNewName] = useState ('')
// const [resources, setResources] = useState([]);
// const resourcesCollectionRef = collection(db, 'resources');

// export const fireProducts = [
//     {
//         title: 'Test basket',
//         category: "All",
//         info: defaultInfo,
//         priceOptions: [{price: '0.10'}],
//         shipping: '0.00',
//         isHighlighted: false,
//         isActive: false,
//         inStock: true,
//         photos: [
//             defaultPhoto
//         ],
//         get key() {
//             return createKey(this.title)
//         }
//     }
// ]


// const deleteResource = async (id) => {
// const resourceDoc = doc(db, 'resources', id);
// await deleteDoc(resourceDoc);
// };

// const createResource = async () => {
// await addDoc(resourcesCollectionRef, { name: newName, link: newLink });
// };

// useEffect(() => {

// const getResources = async () => {
//     const data = await getDocs(resourcesCollectionRef);
//     setResources(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
// };

// getResources();
// }, [])

// return (
// <div className="App">
//     <input
//     placeholder="Resource name..."
//     onChange={(event) => {
//         setNewName(event.target.value);
//     }}
//     />
//     <input
//     placeholder="URL..."
//     onChange={(event) => {
//         setNewLink(event.target.value);
//     }}
//     />
//     <button onClick={createResource}> Create Resource </button>

//     {resources.map((resource) => {
//     return (
//         <div>
//         {' '}
//         <a href={resource.link} target='blank'>{resource.name}</a>
//         <button
//             onClick={() => {
//             deleteResource(resource.id);
//             }}
//         >
//             {' '}
//             Delete Resource{' '}
//         </button>
//         </div>
//     );
//     })}
// </div>
// );


