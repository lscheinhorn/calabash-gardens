import './CartDrawer.css'

export default function CartDrawer () {
    let drawer = null;
            
    function init() {
      drawer = document.getElementById('cart_drawer');
      drawer.style.position= 'relative'; 
      drawer.style.left = '0px'; 
      drawer.style.top = '0px'; 
    
    }
    const open = () => {
      
            
      const distance = 1
      console.log(distance)
      const hop = () => {
        drawer.style.left = parseFloat(drawer.style.left) + distance + '%'
      } 
      
      const open = (frames, time) => {
        frames--
        if(frames){
          setTimeout(() => {
            hop()
            smoothHop(frames, time)
          }, time)
        }
      }
      open(75, 4)
    }
    
    function close(){
      drawer.style.left = '0px';
    }
    
    window.onload = init;


   const slideDrawer = () => {
       const drawer = document.getElementById("cart_drawer")
       const open = () => {
           drawer.style.left 
       }
   }
   
    return (
        <div id="cart_sleave">
            <div id="cart_drawer">
                <button id="drawer_tab" >&#60</button>
                <div>
                    Div 1
                </div>
                <div>
                    Div 2
                </div>
                <div>
                    Div 3
                </div>
            </div>
        </div>
        
    )
}