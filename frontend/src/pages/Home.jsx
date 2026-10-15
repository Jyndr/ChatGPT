import { useEffect , useState } from 'react';
import api from "../api.js"
import {Navigate} from "react-router"

function Home() {
    const [user , setUser] = useState(null);
    const [status , setStatus] = useState("Loading..")

    useEffect(()=>{
        const check = async ()=>{
            try {
                const res = await api.get("/user/profile");
                setUser(res.data);
                setStatus("Logged-In");
            } catch (error) {
                if(error.response?.status === 401){
                    setStatus("Logged-Out");
                }else{
                    setStatus("Error");
                }
            }
        }
        check();
    } , []);

  
    if(status=="Loading..")
    {
        return <p className="p-8">Checking Your Session...</p>
    }

    if(status==="Logged-Out"){
        return <Navigate to="/signup" replace></Navigate>
    }

    if (status === "Error") {
    return <p className="p-8">Could not check your session. Please refresh.</p>;
   }

   return(
    <main className="p-8">
        <h1 className="text-3xl font-bold">Welcome to Chat App</h1>
        <p className="mt-3">Hello, {user.name}!</p>
    </main>
   )
}

export default Home