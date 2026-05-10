import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartConfiguration
} from "chart.js";
import { useEffect, useRef } from "react";

Chart.register(
  CategoryScale,
  LinearScale,
  LineController,
  BarController,
  LineElement,
  BarElement,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

interface Props {
  config: ChartConfiguration;
}

export default function ChartCanvas({ config }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      ...config,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: window.innerWidth < 768 ? false : { duration: 420 },
        plugins: {
          legend: {
            labels: {
              color: "#cce6ff"
            }
          },
          tooltip: {
            backgroundColor: "rgba(10, 16, 34, 0.92)",
            titleColor: "#f7fcff",
            bodyColor: "#cce6ff",
            borderColor: "rgba(0, 212, 255, 0.3)",
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: {
              color: "rgba(255,255,255,0.08)"
            },
            ticks: {
              color: "#9cc8ff"
            }
          },
          y: {
            grid: {
              color: "rgba(255,255,255,0.08)"
            },
            ticks: {
              color: "#9cc8ff"
            }
          }
        },
        ...config.options
      }
    });

    return () => chartRef.current?.destroy();
  }, [config]);

  return (
    <div className="min-h-[260px] md:min-h-[320px]">
      <canvas ref={canvasRef} />
    </div>
  );
}
