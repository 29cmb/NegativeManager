import Image from "next/image";

const Modpack = ({ name, downloads, icon }: {name: string, downloads: string, icon: string}) => {
    return <div className="h-[160px] w-[32.5%] bg-[rgb(31,31,31)] p-[20px] rounded-[20px] outline-[5px] outline-[rgb(50,50,50)] hover:bg-[rgb(40,40,40)] transition-all duration-[0.25s] hover:rotate-2 active:scale-85 hover:scale-110">
        <div className="flex">
            <div className="w-[120px] h-[120px] outline-[rgb(50,50,50)] outline-[5px] rounded-[10px] flex-shrink-0">
                <Image
                    alt="Instance icon"
                    src={icon}
                    width={120}
                    height={120}
                    unoptimized
                    className="max-w-full max-h-full object-contain rounded-[10px]"
                />
            </div>
            <div>
                <p className="ml-[20px] font-bold text-[30px] text-white">{name}</p>
                <p className="text-[20px] font-semibold ml-[20px]">{downloads} downloads</p>
            </div>
        </div>
    </div>
}

export default Modpack;