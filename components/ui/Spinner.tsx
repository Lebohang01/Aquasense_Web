export default function Spinner({ size=6 }:{size?:number}) {
  return (
    <div className={`w-${size} h-${size} rounded-full border-2 border-border border-t-blue animate-spin`} />
  );
}
