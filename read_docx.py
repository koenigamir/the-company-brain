import docx
import sys

def read_docx(file_path):
    try:
        doc = docx.Document(file_path)
        fullText = []
        for para in doc.paragraphs:
            fullText.append(para.text)
        return '\n'.join(fullText)
    except Exception as e:
        return str(e)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(read_docx(sys.argv[1]))
