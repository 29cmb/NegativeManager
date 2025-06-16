'use client'
import Instance from "@/components/Instance";
// import Mod from "@/components/Mod";
// import Modpack from "@/components/Modpack";
import './globals.css'
import { useEffect, useState } from "react";
import InstanceInspectPage from "@/components/pages/InstanceInspectPage";
import Image from "next/image"
import { formatTimePlayed } from "@/Util";
import * as Types from "@/Types"
import { useRouter } from "next/navigation";
import SettingsModal from "@/components/SettingsModal";
import ErrorModal from "@/components/ErrorModal";
import Mod from "@/components/Mod";
import Modpack from "@/components/Modpack";
import ModpackInspectPage from "@/components/pages/ModpackInspectPage";

const HomePage = () => {
    const [instances, setInstances] = useState<Types.Profile[]>([])
    const [instanceMenuOpen, openInstanceMenu] = useState<boolean>(false);
    const [inspectedInstance, setInspectedInstance] = useState<Types.Profile | null>(null);
    const [profileInfoModalOpen, setProfileInfoModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null)
    const [connected, setConnected] = useState<boolean>(false)
    const [topMods, setTopMods] = useState<Types.PublicModData[]>([]);
    const [topModpacks, setTopModpacks] = useState<Types.PublicModpackData[]>([]);
    const [inspectingModpack, setInspectingModpack] = useState<Types.PublicModpackData | null>(null);

    const router = useRouter()

    const refreshInstances = async() => {
        const profiles = await window.electron.getAllProfiles();
        setInstances(profiles || []);
    }

    function formatDownloads(num: number): string {
        if (num >= 1_000_000_000) {
            return `${Math.floor(num / 1_000_000_000)}b`;
        }
        if (num >= 1_000_000) {
            return `${Math.floor(num / 1_000_000)}m`;
        }
        if (num >= 1_000) {
            return `${Math.floor(num / 1_000)}k`;
        }
        return num.toString();
    }

    function chunkArray<T>(arr: T[], size: number): T[][] {
        const result: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
            result.push(arr.slice(i, i + size));
        }
        return result;
    }
    
    // State management stuff
    useEffect(() => {
        (async() => {
            refreshInstances()
            setProfileInfoModalOpen(!(await window.electron.checkPathValidations()))
        })()
    }, [])

    // Logger setup
    useEffect(() => {
        window.electron.onLogEvent((data) => {
            console.log(data.message)
        })
    }, [])

    // Server communications
    useEffect(() => {
        const server = process.env.SERVER_URL as string
        fetch(server).then(() => {
            setConnected(true)
            fetch(server + "/api/v1/modpacks/top/1").then(d => d.json()).then(data => {
                if (Array.isArray(data.modpacks)) {
                    const top = (data.modpacks as Types.PublicModpackData[])
                        .slice()
                        .sort((a: {downloads: number}, b: {downloads: number}) => (b.downloads ?? 0) - (a.downloads ?? 0))
                        .slice(0, 3);

                    setTopModpacks(top);
                }
            })

            fetch(server + "/api/v1/mods/top/1").then(d => d.json()).then(data => {
                if (Array.isArray(data.mods)) {
                    const top = (data.mods as Types.PublicModData[])
                        .slice()
                        .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))
                        .slice(0, 9);

                    setTopMods(top);
                }
            })
        }).catch(() => {
            setError("Could not connect to the registry! Online features have been disabled!")
        })
    }, [])

    return (
        !instanceMenuOpen ? 
            (inspectingModpack == null ? <>
                <ErrorModal error={error} setError={setError} />
                <SettingsModal open={profileInfoModalOpen} setOpen={setProfileInfoModalOpen}/>
                <div className="flex justify-center">
                    <div className="w-[90%] h-[18em] mt-[40px]">
                        <div className="flex justify-between items-end">
                            <div className="flex items-center">
                                <span className="font-bold text-[40px]">Your instances</span>
                                <button onClick={() => {
                                    setInstances([])
                                    setTimeout(() => refreshInstances(), 500)
                                }}>
                                    <Image
                                        src={"https://img.icons8.com/?size=100&id=59872&format=png&color=FFFFFF"}
                                        width={30}
                                        height={30}
                                        alt="Refresh icon"
                                        className="ml-2 hover:scale-120 transition-all ease duration-300 active:rotate-[360deg] cursor-pointer"
                                    />
                                </button>
                            </div>
                            <button
                                className="font-bold text-[20px] text-[#23b9ff] underline cursor-pointer"
                                onClick={() => router.push("./instances")}
                            >
                                See more ⟶
                            </button>
                        </div>
                        <div className="flex flex-wrap justify-between mt-[20px] gap-[20px] ">
                            <div className="flex flex-wrap gap-[12px] w-full">
                                {/* <Instance name="Instance 1" time="2hr 30m" icon="data:image/png;base64,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" />
                                <Instance name="Instance 2" time="2hr 30m" icon="data:image/png;base64,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" />
                                <Instance name="Instance 3" time="2hr 30m" icon="data:image/png;base64,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" /> */}
                                { 
                                    instances
                                        .slice()
                                        .sort((a, b) => (b.LastPlayed ?? 0) - (a.LastPlayed ?? 0))
                                        .slice(0, 3)
                                        .map((instance, index) => (
                                            <Instance
                                                key={index}
                                                time={formatTimePlayed(instance.TimePlayed)}
                                                name={instance.name}
                                                icon={instance.Icon !== "" ? instance.Icon : null}
                                                openInstance={() => {
                                                    setInspectedInstance(instance)
                                                    openInstanceMenu(true)
                                                }}
                                            />
                                        ))
                                }
                            </div>
                        </div>
                    </div>
                </div>
                

                {connected && <>
                    <div className="flex justify-center">
                        <div className="w-[90%] h-[18em]">
                            <div className="flex justify-between items-end">
                                <p className="font-bold text-[40px]">Top modpacks</p>
                                {/* TODO: See more (put this back into a comment when you remove this big one) */}
                                {/* <a className="font-bold text-[20px] text-[#23b9ff]" href="/instances"><u>See more ⟶</u></a> */}
                            </div>
                            <div className="flex flex-wrap justify-between mt-[20px] gap-[20px] ">
                                <div className="flex flex-wrap gap-[12px] w-full">
                                    {/* <Modpack name="Modpack 1" downloads="123m" icon="https://29cmb.github.io/CDN/assets/balatro/icon.png" />
                                    <Modpack name="Modpack 2" downloads="123m" icon="https://29cmb.github.io/CDN/assets/balatro/icon.png" />
                                    <Modpack name="Modpack 3" downloads="123m" icon="https://29cmb.github.io/CDN/assets/balatro/icon.png" /> */}
                                    {topModpacks.map((modpack, index) => (
                                        <Modpack onClick={() => setInspectingModpack(modpack)} name={modpack.name} downloads={formatDownloads(modpack.downloads)} key={index} icon={modpack.icon} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <div className="w-[90%] h-[18em]">
                            <div className="flex justify-between items-end">
                                <p className="font-bold text-[40px]">Top mods</p>
                                {/* TODO: See more (put this back into a comment when you remove this big one) */}
                                {/* <a className="font-bold text-[20px] text-[#23b9ff]" href="/instances"><u>See more ⟶</u></a> */}
                            </div>
                            <div className="flex flex-wrap justify-between mt-[20px] gap-[20px] ">
                                {chunkArray(topMods, 3).map((modRow, rowIdx) => (
                                    <div className="flex flex-wrap gap-[12px] w-full" key={rowIdx}>
                                        {modRow.map((mod, index) => (
                                            <Mod
                                                key={index}
                                                name={mod.name}
                                                downloads={formatDownloads(mod.downloads)}
                                                icon={mod.icon}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>}
            </> : <ModpackInspectPage modpackID={inspectingModpack._id} close={() => setInspectingModpack(null)} />
        ) : <InstanceInspectPage instanceName={inspectedInstance?.name} close={() => openInstanceMenu(false)} />
    )
}

export default HomePage;