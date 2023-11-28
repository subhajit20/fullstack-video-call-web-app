'use client'

import React, { useEffect,useState } from 'react'
import VideoPage from '@/components/pageComponents/VideoPage';
import Frame from '@/components/ui/video/Frame';
import useGeneralMethods from '@/hooks/useGeneralMethods';
import { selectVideoStream } from '@/features/websockets/videoStream';
import { selectWebSocket } from '@/features/websockets/webSocketSlice';
import { selectUser,leftRoom } from '@/features/websockets/userSlice';
import { useAppSelector } from '@/store/hook';
import { useAppDispatch } from '@/store/hook';
import { joinUserToRoom } from '@/features/websockets/userSlice';
import useWebSocket from '@/hooks/useWebSocket';
import { addMessages } from '@/features/websockets/messageSlice';

type Props = {}

interface videoStreamState {
    localStream:MediaStream | null;
    remoteStream:MediaStream | null;
}

const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
];
const configuration = { iceServers };

const VideoCallWrapper = (props: Props) => {
    const [newPeer,setPeer] = useState<RTCPeerConnection>(new RTCPeerConnection(configuration));
    const [mediaProvider,setMedia] = useState<MediaStream | null>(null);
    const [streams,setVideoStreams] = useState<videoStreamState>({
        localStream:null,
        remoteStream:null
    });
    const {search,leave} = useGeneralMethods({
        componentType:"videoCall"
    });
    const {placeCall,openVideo,receiveCall} = useWebSocket();
    const {stream} = useAppSelector(selectVideoStream);
    const {WS} = useAppSelector(selectWebSocket);
    const {userId,roomMembers} = useAppSelector(selectUser);
    const dispatch = useAppDispatch()

    useEffect(()=>{

        newPeer.addEventListener('icecandidate',(e)=>{
            console.log(e.candidate);
            if(WS){
                WS.send(JSON.stringify({
                    iceCandidate : {
                        receiver: userId === roomMembers[0] ? roomMembers[1] : roomMembers[0],
                        iceInfo: e.candidate,
                    }
                }));
            }
        })

        newPeer.ontrack = (e) =>{
            console.log(e.streams);

            setVideoStreams((prev)=>{
                return {
                        ...prev,
                        remoteStream:e.streams[0]
            }})
        }

        if(WS){
            WS.onmessage = async (e) =>{
                const incommingData = JSON.parse(e.data);

                if(incommingData.roomInfo){
                    console.log("From video page",incommingData.roomInfo);
                    const {roomId,members,option} = incommingData.roomInfo;
                    dispatch(joinUserToRoom({
                        id:roomId,
                        members:[...members]
                    }))

                    if(option === "connected" && userId === roomMembers[0]){
                        // create peer
                        // create stream
                        // open video
                        if(mediaProvider === null){
                            openVideo()
                            .then((data)=>{
                                console.log(data);
                                setMedia(data);
                                setVideoStreams((prev)=>{
                                    return {
                                        ...prev,
                                        localStream:data
                                    }
                                })
                                placeCall(
                                    WS,
                                    newPeer,
                                    data!,
                                    userId,
                                    members[1]
                                )
                            })
                        }else{
                            mediaProvider.getTracks().forEach((tracks)=>{
                                tracks.enabled = true
                            })
                            placeCall(
                                WS,
                                newPeer,
                                mediaProvider,
                                userId,
                                members[1]
                            )
                        }
                    }
                }else if(incommingData.message){
                    const {from,roomId,message} = incommingData.message;
                    console.log(from,message);
                    dispatch(addMessages({
                        type:"from",
                        message:message
                    }))
                }else if(incommingData.leave){
                    dispatch(leftRoom());
                    setPeer(new RTCPeerConnection(configuration));
                    console.log(incommingData.leave);
                    if(mediaProvider !== null){
                        mediaProvider.getTracks().forEach((tracks)=>{
                            tracks.enabled = false
                        })
                    }

                    // dispatch(deleteAllMessage());
                    // dispatch(leftMessage({
                    //     type:"leave",
                    //     message:incommingData.leave
                    // }))
                }else if(incommingData.calling){
                    console.log(incommingData.calling);
                    console.log(roomMembers);
                    const caller = userId !== roomMembers[1] ? roomMembers[1] : roomMembers[0];
                    
                    if(mediaProvider){
                        receiveCall(
                            WS,
                            newPeer,
                            mediaProvider,
                            incommingData.calling.offer,
                            incommingData.calling.from, // caller
                            userId! // receiver
                        )
                    }else{
                        openVideo()
                            .then((data)=>{
                                console.log(data);
                                setMedia(data);
                                receiveCall(
                                    WS,
                                    newPeer,
                                    data!,
                                    incommingData.calling.offer,
                                    incommingData.calling.from, // caller
                                    userId!
                                )
                            })
                    }
                }else if(incommingData.accepted){
                    try{
                        console.log(incommingData.accepted);
                        const {answer} = incommingData.accepted;
                        const remoteDesc = new RTCSessionDescription(answer);
                        await newPeer.setRemoteDescription(remoteDesc);
                    }catch(e){
                        console.log(e)
                    }
                }else if(incommingData.iceCandidate){
                    const {iceInfo} = incommingData.iceCandidate;
                    try{
                        await newPeer.addIceCandidate(iceInfo)
                    }catch{
                        console.log(iceInfo)
                    }
                }
            }
        }
    },[WS, dispatch, mediaProvider, newPeer, openVideo, placeCall, receiveCall, roomMembers, userId])

    // useEffect(()=>{
    //     if(roomMembers.length === 0){
    //         setPeer(new RTCPeerConnection(configuration));
    //     }
    // },[roomMembers])
  return (
    <div className='flex justify-center h-[38.2rem] md:h-[49.2rem]'>
        <Frame stream={roomMembers.length === 2 ? mediaProvider : null} remoteStream={roomMembers.length === 2 ? streams.remoteStream : null} />
        <VideoPage stream={stream} searchRoom={search} existRoom={leave} />
    </div>
  )
}

export default VideoCallWrapper