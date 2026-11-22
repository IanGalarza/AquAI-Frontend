import { ChatIcon, type IconName } from "../chat/chat-icon";

type FileTypeStyle = {
  icon: IconName;
  tone: string;
};

const fileTypeStyles: Partial<Record<string, FileTypeStyle>> = {
  pdf: { icon: "file-pdf", tone: "bg-file-pdf/10 text-file-pdf" },
  csv: { icon: "file-csv", tone: "bg-file-csv/10 text-file-csv" },
  xlsx: { icon: "file-xlsx", tone: "bg-file-xlsx/10 text-file-xlsx" },
  docx: { icon: "file-docx", tone: "bg-file-docx/10 text-file-docx" },
};

const unknownFileType: FileTypeStyle = { icon: "file", tone: "bg-primary/10 text-primary" };

type SourceFileIconProps = {
  fileType?: string;
  className?: string;
};

//
// Muestra el ícono del tipo de archivo de una fuente con el color que le corresponde.
//
export function SourceFileIcon({ fileType, className = "" }: SourceFileIconProps) {
  const style = (fileType && fileTypeStyles[fileType]) || unknownFileType;
  return (
    <span className={`grid shrink-0 place-items-center rounded-sm ${style.tone} ${className}`}>
      <ChatIcon name={style.icon} className="size-6" />
    </span>
  );
}
