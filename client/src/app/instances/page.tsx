'use client'
import Instance from "@/components/Instance";
import "../globals.css"
import { useEffect, useState } from "react";
import * as Types from "@/Types"
import Link from "next/link";
import InstanceInspectPage from "@/components/InstanceInspectPage";
import { formatTimePlayed } from "@/Util";

const InstancesPage = () => {
    const [instances, setInstances] = useState<Types.Profile[]>([])
    const [instanceMenuOpen, openInstanceMenu] = useState<boolean>(false);
    const [inspectedInstance, setInspectedInstance] = useState<Types.Profile | null>(null);

    useEffect(() => {
        (async () => {
            const profiles = await window.electron.getAllProfiles();
            setInstances(profiles || []);
        })();
    }, [])

    return !instanceMenuOpen ? <>
        <div className="flex justify-center">
            <div className="w-[90%] h-[18em] mt-[40px]">
                <div>
                    <Link href={"/"} className="font-bold text-[20px] text-[#23b9ff]"><u>Go back</u></Link>
                    <p className="font-bold text-[40px]">All instances</p>
                </div>
                <div className="flex flex-wrap justify-between mt-[20px]">
                    <div className="flex flex-wrap justify-between w-full gap-y-5 gap-x-[20px] mb-[30px]">
                        { 
                            instances
                                .sort((a, b) => (b.LastPlayed ?? 0) - (a.LastPlayed ?? 0))
                                .map((instance, index) => (
                                    <Instance
                                        key={index}
                                        time={formatTimePlayed(instance.TimePlayed)}
                                        name={instance.name}
                                        icon={instance.Icon !== "" ? instance.Icon : null}
                                        full={true}
                                        openInstance={() => {
                                            openInstanceMenu(true)
                                            setInspectedInstance(instance)
                                        }}
                                    />
                                ))
                        }
                    </div>
                </div>
            </div>
        </div>
    </> : <InstanceInspectPage instanceName={inspectedInstance?.name} close={() => openInstanceMenu(false)} />
}

export default InstancesPage;