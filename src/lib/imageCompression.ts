/**
 * Nén ảnh với chất lượng tùy chỉnh mà không thay đổi kích thước
 */
export async function compressImage(
  file: File,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        
        // Vẽ ảnh lên canvas
        ctx.drawImage(img, 0, 0)
        
        // Nén ảnh với quality từ 0 đến 1
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }
            
            const compressedReader = new FileReader()
            compressedReader.onloadend = () => {
              resolve(compressedReader.result as string)
            }
            compressedReader.onerror = reject
            compressedReader.readAsDataURL(blob)
          },
          file.type,
          quality
        )
      }
      
      img.onerror = reject
      img.src = e.target?.result as string
    }
    
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
