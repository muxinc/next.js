import { useEffect, useRef, useState } from 'react'
import Router from 'next/router'
import * as UpChunk from '@mux/upchunk'
import useSwr from 'swr'
import Button from './button'
import Spinner from './spinner'
import ErrorMessage from './error-message'

const fetcher = (url) => {
  return fetch(url).then((res) => res.json())
}

const UploadForm = () => {
  const [isUploading, setIsUploading] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [isRecording, setRecording] = useState(false)
  const [recorder, setRecorder] = useState(null)
  const [buttonText, setButtonText] = useState("Record from the browser")
  const [uploadId, setUploadId] = useState(null)
  const [progress, setProgress] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef(null)

  const { data, error } = useSwr(
    () => (isPreparing ? `/api/upload/${uploadId}` : null),
    fetcher,
    { refreshInterval: 5000 }
  )

  const upload = data && data.upload

  useEffect(() => {
    if (upload && upload.asset_id) {
      Router.push({
        pathname: `/asset/${upload.asset_id}`,
        scroll: false,
      })
    }
  }, [upload])

  if (error) return <ErrorMessage message="Error fetching api" />
  if (data && data.error) return <ErrorMessage message={data.error} />

  const createUpload = async () => {
    try {
      return fetch('/api/upload', {
        method: 'POST',
      })
        .then((res) => res.json())
        .then(({ id, url }) => {
          setUploadId(id)
          return url
        })
    } catch (e) {
      console.error('Error in createUpload', e)
      setErrorMessage('Error creating upload')
    }
  }

  const startUploadFromForm = () => {
    startUpload(inputRef.current.files[0])
  }

  const startUpload = (file) => {
    setIsUploading(true)
    const upload = UpChunk.createUpload({
      endpoint: createUpload,
      file: file,
    })

    upload.on('error', (err) => {
      setErrorMessage(err.detail)
    })

    upload.on('progress', (progress) => {
      setProgress(Math.floor(progress.detail))
    })

    upload.on('success', () => {
      setIsPreparing(true)
    })
  }

  const recordMedia = () => {
    if (recorder !== null && recorder.state === 'recording')  {
      console.log("stopping")
      recorder.stop()
      return
    }
    if (recorder !== null) {
      console.log(recorder.state)
      return
    }
    if (navigator.mediaDevices) {
      console.log("getUserMedia supported.")
      var constraints = { video: true, audio: true }
      const preferredOptions = { mimeType: "video/webm;codecs=vp9" }
      const backupOptions = { mimeType: "video/webm;codecs=vp8,opus" }
      var options = preferredOptions;
      if (!MediaRecorder.isTypeSupported(preferredOptions.mimeType)) {
          console.log("using backup options")
          options = backupOptions
      }
      var chunks = []
      navigator.mediaDevices
          .getUserMedia(constraints)
          .then(function(stream) {
              var mediaRecorder = new MediaRecorder(stream, options)
              setRecorder(mediaRecorder)
              mediaRecorder.start()
              setButtonText("Stop Recording")
              console.log(mediaRecorder.state)
              mediaRecorder.onstop = function(e) {
                  var blob = new Blob(chunks, { type: "video/webm" })
                  chunks = []
                  const file = new File([blob], "video-from-camera")
                  startUpload(file)
              }
              mediaRecorder.ondataavailable = function(e) {
                  chunks.push(e.data)
              }
          })
          .catch(function(err) {
              console.error(err)
              if (recorder !== null) {
                  recorder.stop()
              }
          })
    }
  }  

  if (errorMessage) return <ErrorMessage message={errorMessage} />

  return (
    <>
      <div className="container">
        {isUploading ? (
          <>
            {isPreparing ? (
              <div>Preparing..</div>
            ) : (
              <div>Uploading...{progress ? `${progress}%` : ''}</div>
            )}
            <Spinner />
          </>
        ) : (
          <>
            <div>
              <label>
                <Button type="button" onClick={() => inputRef.current.click()}>
                  Select a video file
                </Button>
                <input type="file" onChange={startUploadFromForm} ref={inputRef} />
              </label>
            </div>
            <div>
              <p>
                or...
              </p>
            </div>
            <div>
              <label>
                <Button type="button" onClick={recordMedia}>
                  {buttonText}
                </Button>
              </label>
            </div>
          </>
        )}
      </div>
      <style jsx>{`
        input {
          display: none;
        }
      `}</style>
    </>
  )
}

export default UploadForm
