import Image from "next/image";
import Link from "next/link";


export default function App() {
  return (
    <div className="h-full overflow-hidden bg-white px-8 md:px-16 py-12 flex flex-col" style={{ fontFamily: "'Instrument Serif', serif" }}>
      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center justify-center overflow-hidden">
        {/* Left: Heading */}
        <div className="w-full lg:w-1/2 text-center lg:text-left">
          <p className="text-xl text-black md:text-2xl mb-4 md:mb-8">
            turn your memories into mail
          </p>

          <h1 className="text-5xl text-black sm:text-6xl md:text-8xl leading-[0.95] tracking-tight">
            send ur friends <br />
            <em>email</em> postcards
          </h1>

          <Link href="/create">
            <button className="mt-8 md:mt-12 px-8 py-4 bg-black text-white hover:bg-black/70 transition-all duration-300 rounded-full">
              Get Started
            </button>
          </Link>
        </div>

        {/* Right: Glass morphism postcards - Desktop */}
        <div className="relative h-150 hidden lg:block lg:w-1/2">
          {/* Postcard 1 - Back left */}
          <div className="absolute top-32 left-0 w-80 -rotate-6 transition-transform hover:rotate-[-8deg] hover:scale-105 duration-300">
            <div className="aspect-4/3 rounded-2xl border border-black/10 bg-white/50 backdrop-blur-xl shadow-2xl overflow-hidden">
              <Image
                src="/postcard1.jpg"
                alt="Beach sunset"
                fill
                sizes="(max-width: 1023px) 288px, 320px"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Postcard 2 - Center */}
          <div className="absolute top-60 left-12 w-80 rotate-3 transition-transform hover:rotate-[5deg] hover:scale-105 duration-300 z-10">
            <div className="aspect-4/3 rounded-2xl border border-black/10 bg-white/50 backdrop-blur-xl shadow-2xl overflow-hidden">
              <Image
                src="/postcard2.jpg"
                alt="Beach sunset"
                fill
                sizes="(max-width: 1023px) 288px, 320px"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Postcard 3 - Front right */}
          <div className="absolute top-44 right-0 w-80 -rotate-3 transition-transform hover:rotate-[-5deg] hover:scale-105 duration-300 z-20">
            <div className="aspect-4/3 rounded-2xl border border-black/10 bg-white/50 backdrop-blur-xl shadow-2xl overflow-hidden">
              <Image
                src="/postcard3.jpg"
                alt="City architecture"
                fill
                sizes="(max-width: 1023px) 288px, 320px"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Mobile: Stack postcards below */}
        <div className="lg:hidden mt-12 relative h-64 w-full">
          {/* Postcard 1 */}
          <div className="absolute top-0 left-1/2 -translate-x-[60%] w-48 sm:w-56 -rotate-6">
            <div className="aspect-4/3 rounded-2xl border border-black/10 bg-white/50 backdrop-blur-xl shadow-2xl overflow-hidden">
              <Image
                src="/postcard1.jpg"
                alt="Mountain landscape"
                fill
                sizes="(max-width: 640px) 192px, 224px"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Postcard 2 */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 sm:w-56 rotate-[4deg] z-10">
            <div className="aspect-4/3 rounded-2xl border border-black/10 bg-white/50 backdrop-blur-xl shadow-2xl overflow-hidden">
              <Image
                src="/postcard2.jpg"
                alt="Beach sunset"
                fill
                sizes="(max-width: 640px) 192px, 224px"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Postcard 3 */}
          <div className="absolute top-8 left-1/2 -translate-x-[40%] w-48 sm:w-56 -rotate-2 z-20">
            <div className="aspect-4/3 rounded-2xl border border-black/10 bg-white/50 backdrop-blur-xl shadow-2xl overflow-hidden">
              <Image
                src="/postcard3.jpg"
                alt="City architecture"
                fill
                sizes="(max-width: 640px) 192px, 224px"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}