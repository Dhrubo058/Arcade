"use client";

import { useParams } from "next/navigation";

export default function Play(){

const params = useParams();
const game = params.game;

return(

<div
style={{
width:"100vw",
height:"100vh",
background:"black"
}}
>

<iframe
src={`/emulator/index.html?game=${game}`}
style={{
border:"none",
width:"100%",
height:"100%"
}}
allowFullScreen
/>

</div>

);

}
