import { faSignIn } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import Image from "next/image";
import img from "@/public/login.jpg";
import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <div className="animate-fade animate-duration-500 animate-ease-linear flex flex-row w-screen h-screen">
      <div className="relative w-1/2 h-screen">
        <Image src={img} alt="sfondo" fill style={{ objectFit: "cover" }} />
      </div>
      <div className=" flex flex-col justify-center items-center w-1/2 h-screen bg-black border border-white">
        <div className="animate-fade-up animate-duration-[2000ms] animate-delay-[1000ms] animate-ease-linear">
          <h1>Baccialegno</h1>
        </div>
        <div className="py-6 w-full flex flex-col justify-center items-center">
          <div className="text-center  animate-fade animate-duration-500 animate-delay-[1500ms] animate-ease-linear">
            <Link href="/api/auth/login">
              <Button className="  text-xl  p-2 rounded-none font-bold">
                <FontAwesomeIcon icon={faSignIn} className="mr-2" />
                Login amministratore
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
