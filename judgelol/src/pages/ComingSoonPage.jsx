import { Clock } from "lucide-react";

export default function ComingSoonPage({ title }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
        <Clock className="w-8 h-8 text-slate-400" />
      </div>
      <h2 className="font-bold text-xl text-slate-700 mb-2">{title}</h2>
      <p className="text-slate-400 text-sm">추후 서비스 추가 예정입니다.</p>
    </div>
  );
}
