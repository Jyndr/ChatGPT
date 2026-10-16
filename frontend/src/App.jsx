import { Route, Routes } from "react-router";
import Home from "../src/pages/Home.jsx";
import Login from "../src/pages/Login.jsx";
import Signup from "../src/pages/SignUp.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/chat/:chatId" element={<Home />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;