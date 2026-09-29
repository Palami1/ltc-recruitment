import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';


interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React Component tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl border border-slate-100 animate-in fade-in zoom-in duration-300">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 border border-red-100">
              <AlertTriangle className="h-10 w-10 text-corporate-accent" />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">
              ເກີດຂໍ້ຜິດພາດໃນການສະແດງຜົນ
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              ຂໍອະໄພ, ລະບົບພົບບັນຫາຂັດຂ້ອງຊົ່ວຄາວ. ທ່ານສາມາດລອງໂຫຼດໜ້າໃໝ່ ຫຼື ກັບຄືນສູ່ໜ້າຫຼັກ.
            </p>
            {this.state.error && (
              <div className="mb-6 p-3 bg-slate-100 rounded-xl text-left text-[11px] font-mono text-slate-700 overflow-x-auto max-h-24">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-corporate-primary text-white font-bold text-sm shadow-md hover:bg-corporate-primary/90 transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" /> ໂຫຼດໜ້າໃໝ່
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm border border-slate-200 transition-all active:scale-95"
              >
                <Home className="w-4 h-4 text-slate-500" /> ໜ້າຫຼັກ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
