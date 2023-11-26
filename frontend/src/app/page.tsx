'use client'
import React,{useEffect} from "react";
import { useAppDispatch,useAppSelector } from "@/store/hook";
import {connect,disconnect} from '@/features/websockets/webSocketSlice';
import { loadUser,joinUserToRoom, leftRoom } from "@/features/websockets/userSlice";
import { addMessages,deleteAllMessage,leftMessage } from "@/features/websockets/messageSlice";
import {addPeer} from "@/features/websockets/videoStream";
import useWebSocket from "@/hooks/useWebSocket";
import Link from "next/link";

type StateType = {
  peer?:RTCPeerConnection,
  stream?:MediaStream
}
export default function Home() {
  const [streamInfo,setStreamInfo] = React.useState<StateType>();
  const {joinMessageChatRoom,joinVideoCallChatRoom} = useWebSocket()
  const {webSocketReducer,userReducer,videoReducer} = useAppSelector((state) => state);
  const dispatch = useAppDispatch();
  const {WS,connected} = webSocketReducer;
  const {peer} = videoReducer;
  const {userId,roomMembers} = userReducer;

  // const Call = async (e:React.MouseEvent<HTMLElement>) =>{
  //   const conf = {
  //     video:true,
  //     audio:true
  //   }
  //   try{
  //     const stream = await navigator.mediaDevices.getUserMedia(conf);

  //     const offer = await createOfferForRemoteUser(streamInfo?.peer,stream);
      
  //   }catch(e){
  //     console.log(e);
  //   }
  // }
  // const joinMessageChatRoom = () =>{
  //   WS?.send(JSON.stringify({
  //     join:{
  //       userId:userId,
  //       type:"text"
  //     }
  //   }))
  //   dispatch(leftMessage({
  //       type:"join",
  //       message:"null"
  //     }))
  // }

  useEffect(()=>{
    if(!streamInfo?.peer){
       const iceServers = [
           { urls: 'stun:stun.l.google.com:19302' },
       ];
      const configuration = { iceServers };

      const peer = new RTCPeerConnection(configuration);
       setStreamInfo((prev)=>{
        return {
          ...prev,
          peer:peer
        }
      });
    }
  },[])

  useEffect(()=>{
    if(!WS){
      dispatch(connect({
        port:"8080"
      }))
    }
  },[])

  useEffect(()=>{
    if(peer === null){
      let newPeer = new RTCPeerConnection();
      dispatch(addPeer({
        peer:newPeer
      }))
    }
  },[peer])

  useEffect(()=>{
    if(WS){
      WS.onmessage = (e) =>{
        const incommingData = JSON.parse(e.data);

        if(incommingData.user){
          const {user} = incommingData;
          console.log(user);
          dispatch(loadUser({
            id:user
          }))
        }else if(incommingData.roomInfo){
          console.log(incommingData.roomInfo)
          const {roomId,members,option} = incommingData.roomInfo;
          dispatch(joinUserToRoom({
            id:roomId,
            members:[...members]
          }))

          if(option !== "" && option === 'connected' && userId === members[0]){
            WS.send(JSON.stringify({
              openVideo:{
                type:"offer",
                info:"Offerrrrrrrr",
                caller:userId,
                receiver:members[1]
              }
            }))
          }
        }else if(incommingData.message){
          const {from,roomId,message} = incommingData.message;
          console.log(from,message);
          dispatch(addMessages({
            type:"from",
            message:message
          }))
        }else if(incommingData.leave){
          console.log(incommingData.leave)
          dispatch(leftRoom());
          dispatch(deleteAllMessage());
          dispatch(leftMessage({
            type:"leave",
            message:incommingData.leave
          }))
        }else if(incommingData.calling){
          if(userId === roomMembers[1]){
            WS.send(JSON.stringify({
                type:"answer",
                info:"Offerrrrrrrr",
                receiver:userId,
                caller:roomMembers[0]
            }))
          }
        }else if(incommingData.accepted){
          console.log("Accepted .....")
        }
      }

    }
  },[WS])


  return (
    <main className="min-h-screen py-5">
      <div className="flex justify-center items-center gap-x-4 min-h-[40rem]">
        <Link href={'/text'} onClick={()=> joinMessageChatRoom(WS!,userId!)} >
          <button  className='btn outline success w-[7rem] text-base'>
          Text
          </button>
        </Link>
        <span>or</span>
        <Link href={"/videocall"} onClick={()=> joinVideoCallChatRoom(WS!,userId!)}>
          <button className='btn outline warn w-[8rem] text-base'>
            Video Call
          </button>
        </Link>
      </div>
    </main>
  )
}
