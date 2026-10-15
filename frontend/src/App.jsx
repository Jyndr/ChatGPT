import React from 'react'
import {Route , Routes} from "react-router"
import Home from "./pages/Home.jsx"
import Login from "./pages/Login.jsx"
import SignUp from "./pages/SignUp.jsx"

function App() {
  return (
    <Routes>
      <Route path = "/" element = {<Home></Home>}></Route>
      <Route path = "/SignUp" element = {<SignUp></SignUp>}></Route>
      <Route path = "/Login" element = {<Login></Login>}></Route>
    </Routes>
  )
}

export default App